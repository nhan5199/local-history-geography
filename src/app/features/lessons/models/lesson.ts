export type LessonCategory = 'History' | 'Geography';

export interface QuizQuestion {
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  category: LessonCategory;
  title: string;
  subtitle: string;
  duration: number;
  level: string;
  illustration: string;
  color: 'mint' | 'peach' | 'lavender' | 'sky';
  learningGoals: string[];
  sections: { heading: string; body: string; tryIt: string }[];
  quiz: QuizQuestion[];
}
