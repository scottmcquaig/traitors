import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/auth/session';
import { COLLECTIONS, League, DraftPick } from '@/types/firebase';

/**
 * POST /api/leagues/[leagueId]/draft/complete
 * Complete/lock the draft (admin only)
 *
 * Validates:
 * - League exists
 * - User is the league admin
 * - Draft is currently in_progress
 * - All picks have been made (players * rosterSize)
 *
 * After completion:
 * - Sets draftStatus to 'completed'
 * - Prevents any further changes to picks
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const session = await getCurrentUser();

    if (!session.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { leagueId } = await params;
    const db = getAdminFirestore();

    // Get league document
    const leagueRef = db.collection(COLLECTIONS.LEAGUES).doc(leagueId);
    const leagueDoc = await leagueRef.get();

    if (!leagueDoc.exists) {
      return NextResponse.json(
        { error: 'Not Found', message: 'League not found' },
        { status: 404 }
      );
    }

    const league = { id: leagueDoc.id, ...leagueDoc.data() } as League;

    // Check user is admin
    if (league.adminUid !== session.user.uid) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only the league admin can complete the draft' },
        { status: 403 }
      );
    }

    // Check draft is in progress
    if (league.draftStatus === 'completed') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Draft is already completed' },
        { status: 400 }
      );
    }

    if (league.draftStatus === 'pending') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Draft has not been started yet' },
        { status: 400 }
      );
    }

    // Calculate total picks needed
    const totalPicksNeeded = league.draftOrder.length * league.rosterSize;

    // Count actual picks made
    const picksSnapshot = await db
      .collection(COLLECTIONS.DRAFT_PICKS)
      .where('leagueId', '==', leagueId)
      .get();

    const pickCount = picksSnapshot.size;

    if (pickCount < totalPicksNeeded) {
      return NextResponse.json(
        { error: 'Bad Request', message: `Cannot complete draft. ${pickCount} of ${totalPicksNeeded} picks made.` },
        { status: 400 }
      );
    }

    // Complete the draft
    await leagueRef.update({
      draftStatus: 'completed',
    });

    // Get pick summary by player
    const picks = picksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as DraftPick[];

    const picksByPlayer: Record<string, number> = {};
    picks.forEach(pick => {
      picksByPlayer[pick.playerUid] = (picksByPlayer[pick.playerUid] || 0) + 1;
    });

    return NextResponse.json({
      message: 'Draft completed and locked successfully',
      leagueId,
      draftStatus: 'completed',
      totalPicks: pickCount,
      picksByPlayer,
    });
  } catch (error) {
    console.error('Error completing draft:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to complete draft' },
      { status: 500 }
    );
  }
}
