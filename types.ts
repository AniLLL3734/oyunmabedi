
export enum GameType {
  SWF = 'SWF',
  HTML5 = 'HTML5',
}

export interface Game {
  id: string;
  title: string;
  description: string;
  type: GameType;
  url: string;
  thumbnail: string;
  category: string;
  tags: string[];
  controls: string;
}
