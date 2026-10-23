export interface GuideSource {
  key: string;
  url: string;
  title: string;
}

export interface GuideAnswer {
  text: string;
  sources: GuideSource[];
  suggestions?: string[];
}

export interface GuideContext { url?: string; previousSourceKey?: string; }

export interface GuideMessage extends GuideAnswer {
  id: number;
  role: 'user' | 'guide';
}
