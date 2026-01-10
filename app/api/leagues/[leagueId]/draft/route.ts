import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/auth/session';
import { COLLECTIONS, League, DraftPick, Contestant, User, CreateDraftPickData } from '@/types/firebase';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Helper to get the current player for a given pick number using snake draft order
 */
function getPlayerForPick(draftOrder: string[], pickNumber: number, rosterSize: number): string | null {
  const numPlayers = draftOrder.length;
  if (numPlayers === 0) return null;

  const round = Math.ceil(pickNumber / numPlayers);
  const positionInRound = (pickNumber - 1) % numPlayers;

  // Snake draft: odd rounds go forward, even rounds go backward
  const playerIndex = round % 2 === 1
    ? positionInRound
    : numPlayers - 1 - positionInRound;

  return draftOrder[playerIndex] || null;
}

/**
 * GET /api/leagues/[leagueId]/draft
 * Get current draft state including picks, currentPick, and status
 */
export async function GET(
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
    const leagueDoc = await db.collection(COLLECTIONS.LEAGUES).doc(leagueId).get();

    if (!leagueDoc.exists) {
      return NextResponse.json(
        { error: 'Not Found', message: 'League not found' },
        { status: 404 }
      );
    }

    const league = { id: leagueDoc.id, ...leagueDoc.data() } as League;

    // Check if user is part of the league (admin or player)
    const isAdmin = league.adminUid === session.user.uid;
    const isPlayer = league.playerUids?.includes(session.user.uid) || false;

    if (!isAdmin && !isPlayer) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You are not a member of this league' },
        { status: 403 }
      );
    }

    // Get all draft picks for this league
    const picksSnapshot = await db
      .collection(COLLECTIONS.DRAFT_PICKS)
      .where('leagueId', '==', leagueId)
      .orderBy('pickOrder', 'asc')
      .get();

    const picks: DraftPick[] = picksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as DraftPick[];

    // Get contestants for this league (to show available ones)
    const contestantsSnapshot = await db.collection(COLLECTIONS.CONTESTANTS).get();
    const allContestants: Contestant[] = contestantsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Contestant[];

    // Get picked contestant IDs
    const pickedContestantIds = new Set(picks.map(p => p.contestantId));
    const availableContestants = allContestants.filter(c => !pickedContestantIds.has(c.id));

    // Calculate total picks needed
    const totalPicks = league.draftOrder.length * league.rosterSize;

    // Determine whose turn it is
    const currentPlayerUid = league.draftStatus === 'in_progress' && league.currentPick
      ? getPlayerForPick(league.draftOrder, league.currentPick, league.rosterSize)
      : null;

    // Get player info for display
    const allUids = [...league.draftOrder, ...league.playerUids];
    const playerUidsToFetch = Array.from(new Set(allUids));
    const playersMap: Record<string, { uid: string; displayName: string }> = {};

    if (playerUidsToFetch.length > 0) {
      const usersSnapshot = await db
        .collection(COLLECTIONS.USERS)
        .where('uid', 'in', playerUidsToFetch.slice(0, 10)) // Firestore limit
        .get();

      usersSnapshot.docs.forEach(doc => {
        const user = doc.data() as User;
        playersMap[user.uid] = { uid: user.uid, displayName: user.displayName };
      });
    }

    return NextResponse.json({
      leagueId,
      status: league.draftStatus,
      currentPick: league.currentPick || null,
      totalPicks,
      currentPlayerUid,
      currentPlayerName: currentPlayerUid ? playersMap[currentPlayerUid]?.displayName : null,
      picks: picks.map(p => ({
        id: p.id,
        contestantId: p.contestantId,
        playerUid: p.playerUid,
        playerName: playersMap[p.playerUid]?.displayName || 'Unknown',
        pickOrder: p.pickOrder,
        round: p.round,
      })),
      availableContestants: availableContestants.map(c => ({
        id: c.id,
        name: c.name,
        imageUrl: c.imageUrl,
      })),
      draftOrder: league.draftOrder.map((uid, index) => ({
        uid,
        displayName: playersMap[uid]?.displayName || 'Unknown',
        position: index + 1,
      })),
      rosterSize: league.rosterSize,
      isAdmin,
      isCurrentPlayer: currentPlayerUid === session.user.uid,
    });
  } catch (error) {
    console.error('Error getting draft state:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to get draft state' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leagues/[leagueId]/draft
 * Make a draft pick
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

    // Parse request body
    let body: { contestantId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { contestantId } = body;

    if (!contestantId || typeof contestantId !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'contestantId is required' },
        { status: 400 }
      );
    }

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

    // Check draft is in progress
    if (league.draftStatus !== 'in_progress') {
      return NextResponse.json(
        { error: 'Bad Request', message: `Cannot make picks when draft is ${league.draftStatus}` },
        { status: 400 }
      );
    }

    // Check if user is the current picker (or admin making picks)
    const isAdmin = league.adminUid === session.user.uid;
    const currentPlayerUid = getPlayerForPick(
      league.draftOrder,
      league.currentPick || 1,
      league.rosterSize
    );

    if (!isAdmin && session.user.uid !== currentPlayerUid) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'It is not your turn to pick' },
        { status: 403 }
      );
    }

    // Verify contestant exists
    const contestantDoc = await db.collection(COLLECTIONS.CONTESTANTS).doc(contestantId).get();

    if (!contestantDoc.exists) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Contestant not found' },
        { status: 404 }
      );
    }

    // Check contestant hasn't already been picked
    const existingPick = await db
      .collection(COLLECTIONS.DRAFT_PICKS)
      .where('leagueId', '==', leagueId)
      .where('contestantId', '==', contestantId)
      .limit(1)
      .get();

    if (!existingPick.empty) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Contestant has already been picked' },
        { status: 400 }
      );
    }

    // Calculate round number
    const currentPick = league.currentPick || 1;
    const numPlayers = league.draftOrder.length;
    const round = Math.ceil(currentPick / numPlayers);
    const totalPicks = numPlayers * league.rosterSize;

    // Create the draft pick
    const pickData: CreateDraftPickData = {
      contestantId,
      playerUid: currentPlayerUid || session.user.uid,
      pickOrder: currentPick,
      round,
    };

    const pickRef = await db.collection(COLLECTIONS.DRAFT_PICKS).add({
      leagueId,
      ...pickData,
      createdAt: Timestamp.now(),
    });

    // Update league with next pick number
    const nextPick = currentPick + 1;
    const isComplete = nextPick > totalPicks;

    await leagueRef.update({
      currentPick: isComplete ? currentPick : nextPick,
      // Don't auto-complete, admin must explicitly complete
    });

    return NextResponse.json({
      message: 'Pick recorded successfully',
      pick: {
        id: pickRef.id,
        ...pickData,
      },
      nextPick: isComplete ? null : nextPick,
      isLastPick: isComplete,
    }, { status: 201 });
  } catch (error) {
    console.error('Error making draft pick:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to make draft pick' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/leagues/[leagueId]/draft
 * Update draft - undo pick (admin only)
 */
export async function PATCH(
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

    // Parse request body
    let body: { action?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { action } = body;

    if (action !== 'undo') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid action. Supported: undo' },
        { status: 400 }
      );
    }

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
        { error: 'Forbidden', message: 'Only the league admin can undo picks' },
        { status: 403 }
      );
    }

    // Check draft is in progress
    if (league.draftStatus !== 'in_progress') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Can only undo picks when draft is in progress' },
        { status: 400 }
      );
    }

    // Get the last pick
    const lastPickSnapshot = await db
      .collection(COLLECTIONS.DRAFT_PICKS)
      .where('leagueId', '==', leagueId)
      .orderBy('pickOrder', 'desc')
      .limit(1)
      .get();

    if (lastPickSnapshot.empty) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'No picks to undo' },
        { status: 400 }
      );
    }

    const lastPick = lastPickSnapshot.docs[0];
    const lastPickData = lastPick.data() as DraftPick;

    // Delete the last pick
    await lastPick.ref.delete();

    // Update league current pick
    await leagueRef.update({
      currentPick: lastPickData.pickOrder,
    });

    return NextResponse.json({
      message: 'Last pick undone successfully',
      undonePickOrder: lastPickData.pickOrder,
      currentPick: lastPickData.pickOrder,
    });
  } catch (error) {
    console.error('Error undoing draft pick:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to undo draft pick' },
      { status: 500 }
    );
  }
}
