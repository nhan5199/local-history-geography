export type QuestionType = 'single' | 'multiple' | 'yesno' | 'order' | 'match' | 'fill';
export interface LearningQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  answers: string[];
  explanation: string;
}
export interface QuestionSet {
  id: string;
  title: string;
  mode: 'questions' | 'game';
  questions: LearningQuestion[];
  createdAt: number;
  createdBy: string;
}
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single: 'Một đáp án đúng', multiple: 'Nhiều đáp án đúng', yesno: 'Đúng / Sai',
  order: 'Sắp xếp thứ tự', match: 'Ghép cặp', fill: 'Điền từ còn thiếu',
};
