import type { QuestionSet } from '../../core/firebase/question.models';

/** Explicit practice samples. Never used as a fallback for a failed catalog read. */
export const DEMO_QUESTION_SETS: QuestionSet[] = [
  {
    id: 'demo-questions',
    title: 'Bài tập mẫu: Khám phá Đồng Nai',
    mode: 'questions',
    createdAt: 0,
    createdBy: 'Dữ liệu minh họa',
    questions: [
      {
        id: 'demo-single', type: 'single',
        prompt: 'Dòng sông nào mang cùng tên với tỉnh Đồng Nai?',
        options: ['Sông Đồng Nai', 'Sông Hồng', 'Sông Hương'],
        answers: ['Sông Đồng Nai'],
        explanation: 'Sông Đồng Nai là dòng sông quen thuộc của vùng đất này.',
      },
      {
        id: 'demo-multiple', type: 'multiple',
        prompt: 'Những địa danh nào thuộc Đồng Nai?',
        options: ['Hồ Trị An', 'Văn miếu Trấn Biên', 'Hồ Hoàn Kiếm'],
        answers: ['Hồ Trị An', 'Văn miếu Trấn Biên'],
        explanation: 'Hồ Trị An và Văn miếu Trấn Biên đều là những địa danh ở Đồng Nai.',
      },
      {
        id: 'demo-yesno', type: 'yesno',
        prompt: 'Hồ Trị An nằm ở Đồng Nai. Đúng hay sai?',
        options: ['Đúng', 'Sai'], answers: ['true'],
        explanation: 'Đúng rồi! Hồ Trị An nằm trên địa bàn tỉnh Đồng Nai.',
      },
    ],
  },
  {
    id: 'demo-game',
    title: 'Trò chơi mẫu: Du ngoạn Đồng Nai',
    mode: 'game',
    createdAt: 0,
    createdBy: 'Dữ liệu minh họa',
    questions: [
      {
        id: 'game-single', type: 'single',
        prompt: 'Dòng sông nào mang tên tỉnh Đồng Nai?',
        options: ['Sông Đồng Nai', 'Sông Hồng', 'Sông Hương'], answers: ['Sông Đồng Nai'],
        explanation: 'Đó là sông Đồng Nai!',
      },
      {
        id: 'game-multiple', type: 'multiple',
        prompt: 'Chọn các địa danh ở Đồng Nai.',
        options: ['Hồ Trị An', 'Văn miếu Trấn Biên', 'Hồ Hoàn Kiếm'],
        answers: ['Hồ Trị An', 'Văn miếu Trấn Biên'],
        explanation: 'Hồ Trị An và Văn miếu Trấn Biên nằm ở Đồng Nai.',
      },
      {
        id: 'game-yesno', type: 'yesno',
        prompt: 'Sông Đồng Nai chảy qua tỉnh Đồng Nai. Đúng hay sai?',
        options: ['Đúng', 'Sai'], answers: ['true'],
        explanation: 'Đúng rồi! Sông Đồng Nai chảy qua tỉnh Đồng Nai.',
      },
      {
        id: 'game-order', type: 'order',
        prompt: 'Sắp xếp các chữ để tạo thành tên tỉnh của chúng mình.',
        options: ['Nai', 'Đồng'], answers: ['Đồng', 'Nai'],
        explanation: 'Hai chữ ghép lại thành Đồng Nai.',
      },
      {
        id: 'game-match', type: 'match',
        prompt: 'Nối địa danh với lời gợi ý phù hợp.',
        options: ['Hồ Trị An', 'Văn miếu Trấn Biên'],
        answers: ['Hồ nước', 'Di tích văn hóa'],
        explanation: 'Hồ Trị An là hồ nước; Văn miếu Trấn Biên là di tích văn hóa.',
      },
      {
        id: 'game-fill', type: 'fill',
        prompt: 'Điền chữ còn thiếu: Sông ___ Nai.',
        options: [], answers: ['Đồng'],
        explanation: 'Tên dòng sông là sông Đồng Nai.',
      },
    ],
  },
];
