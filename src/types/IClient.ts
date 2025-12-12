// these event interfaces are emitted by the client to the server

export interface ICreateGame {
  // username: string
  gameType: string
}

export interface IJoinGame {
  username: string;
  gameid: string;
}

export interface IStartGame {
  gameid: string;
  recipe?: any;
}

export interface ILeaveGame {
  username: string;
  gameid: string;
}

export interface IRejoinGame {
  username: string;
  gameid: string;
}

export interface IActivateChallenge {
  gameid: string;
  challengeType: 'custom' | 'standard';
  gameType?: string; // For standard challenges: 'alphabet_typing', etc.
  name: string;
  description: string;
  reward: {
    type: 'points' | 'buff' | 'debuff';
    value: number | string;
  };
}

export interface IStartChallenge {
  gameid: string;
  challengeId: string;
}

export interface IEndChallenge {
  gameid: string;
  challengeId: string;
  winner: string;
}

export interface IJoinChallenge {
  gameid: string;
  challengeId: string;
  username: string;
}

export interface ILeaveChallenge {
  gameid: string;
  challengeId: string;
  username: string;
}

export interface ISubmitChallengeResult {
  gameid: string;
  challengeId: string;
  result: string | number; // For standard challenges, this might be a number (time, score, etc.)
  username?: string; // For standard challenges, username is required
}