import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/auth/session';
import { COLLECTIONS, League, Contestant } from '@/types/firebase';

/**
 * POST /api/leagues/[leagueId]/draft/start
 * Start the draft (admin only)
 *
 * Validates:
 * - League exists
 * - User is the league admin
 * - Draft is currently pending
 * - At least 2 players in draft order
 * - Enough contestants for all picks (players * rosterSize)
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
        { error: 'Forbidden', message: 'Only the league admin can start the draft' },
        { status: 403 }
      );
    }

    // Check draft is pending
    if (league.draftStatus !== 'pending') {
      return NextResponse.json(
        { error: 'Bad Request', message: `Cannot start draft when status is ${league.draftStatus}` },
        { status: 400 }
      );
    }

    // Validate draft order has at least 2 players
    if (!league.draftOrder || league.draftOrder.length < 2) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Draft order must have at least 2 players' },
        { status: 400 }
      );
    }

    // Calculate total picks needed
    const totalPicksNeeded = league.draftOrder.length * league.rosterSize;

    // Count available contestants
    const contestantsSnapshot = await db.collection(COLLECTIONS.CONTESTANTS).get();
    const contestantCount = contestantsSnapshot.size;

    if (contestantCount < totalPicksNeeded) {
      return NextResponse.json(
        { error: 'Bad Request', message: `Not enough contestants. Need ${totalPicksNeeded} but only have ${contestantCount}` },
        { status: 400 }
      );
    }

    // Validate all players in draft order are valid users
    const playerUids = league.draftOrder;
    const usersSnapshot = await db
      .collection(COLLECTIONS.USERS)
      .where('uid', 'in', playerUids.slice(0, 10)) // Firestore limit
      .get();

    const validUserUids = new Set(usersSnapshot.docs.map(doc => doc.data().uid));
    const invalidPlayers = playerUids.filter(uid => !validUserUids.has(uid));

    if (invalidPlayers.length > 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: `Invalid player UIDs in draft order: ${invalidPlayers.join(', ')}` },
        { status: 400 }
      );
    }

    // Start the draft
    await leagueRef.update({
      draftStatus: 'in_progress',
      currentPick: 1,
    });

    return NextResponse.json({
      message: 'Draft started successfully',
      leagueId,
      draftStatus: 'in_progress',
      currentPick: 1,
      totalPicks: totalPicksNeeded,
      playerCount: league.draftOrder.length,
      rosterSize: league.rosterSize,
    });
  } catch (error) {
    console.error('Error starting draft:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to start draft' },
      { status: 500 }
    );
  }
}
