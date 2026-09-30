export interface GuideSource {
  lessonId: string;
  title: string;
}

export interface GuideAnswer {
  text: string;
  sources: GuideSource[];
}

export interface GuideMessage extends GuideAnswer {
  id: number;
  role: 'user' | 'guide';
}
