import type { Lesson } from '../models/lesson';

// These are place-neutral examples. Replace them with researched, locally reviewed lessons.
export const SAMPLE_LESSONS: Lesson[] = [
  {
    id: 'read-a-neighborhood-map', category: 'Geography', title: 'Read a neighborhood map',
    subtitle: 'Find your way using symbols, a key, and directions.', duration: 12,
    level: 'Ages 8–11', illustration: '⌖', color: 'mint',
    learningGoals: ['Use a map key', 'Describe a route', 'Notice nearby features'],
    sections: [
      { bodyVi: "Bản đồ là hình vẽ một nơi nhìn từ trên cao. Bản đồ có thể thể hiện đường phố, công viên, sông và nhà. Chú giải giải thích ý nghĩa của màu sắc và ký hiệu.", tryItVi: "Vẽ bản đồ một căn phòng, thêm ký hiệu cửa và ghi ý nghĩa của ký hiệu đó.", heading: 'A map tells a story', body: 'A map is a picture of a place seen from above. It can show streets, parks, rivers, and buildings. A map key explains what its colors and symbols mean.', tryIt: 'Draw a small map of one room. Make a symbol for the door and add it to a key.' },
      { bodyVi: "Nhiều bản đồ dùng mũi tên hoặc hoa gió để chỉ hướng bắc. Khi biết hướng bắc, em có thể mô tả vị trí của nơi này so với nơi khác.", tryItVi: "Chọn hai nơi trên bản đồ và dùng từ chỉ hướng để mô tả đường đi giữa chúng.", heading: 'Find your direction', body: 'Many maps show north with an arrow or compass rose. Once you know which way is north, you can describe where one place is compared with another.', tryIt: 'Pick two places on a map. Describe how to travel from one to the other using direction words.' },
    ],
    quiz: [
      { prompt: 'What does a map key help you understand?', choices: ['The meaning of symbols', 'The age of a building', 'The weather tomorrow'], answerIndex: 0, explanation: 'A map key explains the symbols and colors used on a map.' },
      { prompt: 'Which tool helps you tell north from south?', choices: ['A timeline', 'A compass rose', 'A photograph'], answerIndex: 1, explanation: 'A compass rose or north arrow shows direction.' },
    ],
  },
  {
    id: 'a-place-through-time', category: 'History', title: 'A place through time',
    subtitle: 'Compare old and new clues to see how a place changes.', duration: 15,
    level: 'Ages 8–11', illustration: '◷', color: 'peach',
    learningGoals: ['Compare sources', 'Spot change and continuity', 'Ask a history question'],
    sections: [
      { bodyVi: "Ảnh, bản đồ, đồ vật và câu chuyện giúp ta tìm hiểu quá khứ. Mỗi nguồn chỉ cho biết một phần, nên cần so sánh nhiều nguồn.", tryItVi: "Tìm một bức ảnh cũ của con đường quen thuộc. Điều gì thay đổi và điều gì vẫn giống trước?", heading: 'Look for clues', body: 'Photographs, maps, objects, and stories can help us learn about the past. Each clue shows only part of the story, so historians compare more than one source.', tryIt: 'Find an older photograph of a familiar street. What looks different? What looks the same?' },
      { bodyVi: "Một tòa nhà có thể được dùng vào việc mới, con đường có thể rộng hơn. Cây hoặc địa danh có thể vẫn còn. Quan sát cả điều thay đổi và điều còn giữ lại giúp ta hiểu một nơi qua thời gian.", tryItVi: "Viết một câu hỏi dành cho người còn nhớ nơi này ngày xưa.", heading: 'Ask what changed', body: 'A building may have a new use. A road may be wider. Some trees or landmarks may still be there. Noticing both changes and things that stayed the same helps us understand a place over time.', tryIt: 'Write one question you would ask someone who remembers this place long ago.' },
    ],
    quiz: [
      { prompt: 'Which pair could help you study how a street changed?', choices: ['Two photographs from different years', 'Two identical pencils', 'Two weather forecasts'], answerIndex: 0, explanation: 'Images from different times let you compare what changed.' },
      { prompt: 'Why use more than one historical source?', choices: ['To make the answer longer', 'Because one source may show only part of the story', 'Because old sources are always wrong'], answerIndex: 1, explanation: 'Different sources can reveal different details and viewpoints.' },
    ],
  },
  {
    id: 'where-water-goes', category: 'Geography', title: 'Where does water go?',
    subtitle: 'Follow rainwater from a hill to a stream and beyond.', duration: 10,
    level: 'Ages 8–11', illustration: '≈', color: 'sky',
    learningGoals: ['Trace water flow', 'Recognize higher and lower land', 'Care for waterways'],
    sections: [
      { bodyVi: "Nước mưa chảy từ nơi cao xuống nơi thấp. Các dòng nước nhỏ có thể hợp thành suối, rồi nhập vào dòng nước lớn hơn.", tryItVi: "Sau cơn mưa, quan sát nước trên lối đi từ chỗ an toàn. Nước chảy về đâu và đọng ở đâu?", heading: 'Water moves downhill', body: 'Rainwater flows from higher places to lower places. Small flows can join to make streams, and streams can join larger waterways.', tryIt: 'After rain, safely watch where water moves on a path. Where does it collect?' },
      { bodyVi: "Hình dạng mặt đất dẫn đường cho nước. Điều xảy ra ở thượng nguồn có thể ảnh hưởng đến hạ lưu, nên cần chăm sóc cống thoát nước và dòng suối quanh mình.", tryItVi: "Tìm một dòng nước trên bản đồ và thử lần theo đường đi của nó.", heading: 'Land and water connect', body: 'The shape of the land guides the water. What happens upstream can affect places downstream, so caring for local drains and streams matters.', tryIt: 'On a map, find a waterway near you. Can you trace its route?' },
    ],
    quiz: [
      { prompt: 'In which direction does rainwater usually flow across land?', choices: ['From lower to higher land', 'From higher to lower land', 'Only toward roads'], answerIndex: 1, explanation: 'Gravity usually pulls surface water downhill.' },
      { prompt: 'What can happen when small streams meet?', choices: ['They can form a larger waterway', 'They become roads', 'They stop moving'], answerIndex: 0, explanation: 'Small flows can join and make a larger stream or river.' },
    ],
  },
  {
    id: 'stories-of-a-landmark', category: 'History', title: 'Stories of a landmark',
    subtitle: 'Discover how one familiar place can mean many things.', duration: 14,
    level: 'Ages 8–11', illustration: '⌂', color: 'lavender',
    learningGoals: ['Identify landmarks', 'Listen to perspectives', 'Record a source'],
    sections: [
      { bodyVi: "Địa danh hoặc mốc dễ nhận biết giúp mọi người tìm đường. Đó có thể là ngôi nhà, cây cầu, cây lớn, tượng đài hoặc quảng trường.", tryItVi: "Kể tên và phác họa một nơi mà nhiều người trong cộng đồng em nhận ra.", heading: 'What makes a landmark?', body: 'A landmark is a place people recognize and use to find their way. It might be a building, bridge, tree, monument, or public square.', tryIt: 'Name a place many people in your community would recognize. Sketch it.' },
      { bodyVi: "Mỗi người có thể nhớ về cùng một địa danh theo cách khác nhau. Hãy hỏi ai từng dùng nơi đó, chuyện gì xảy ra và nơi đó thay đổi thế nào. Ghi lại người đã kể mỗi câu chuyện.", tryItVi: "Hỏi một người lớn đáng tin về nơi quen thuộc. Ghi lại một kỷ niệm và tên người đã chia sẻ.", heading: 'Many people, many stories', body: 'People can remember the same landmark in different ways. Ask who used it, what happened there, and how its purpose may have changed. Record who shared each story.', tryIt: 'Ask a trusted adult about a familiar place. Write down one memory and the person who shared it.' },
    ],
    quiz: [
      { prompt: 'Which could be a landmark?', choices: ['Only a very tall building', 'A familiar bridge, tree, or square', 'Only a place on a world map'], answerIndex: 1, explanation: 'A landmark can be many kinds of recognizable places.' },
      { prompt: 'When recording a story about a place, what should you include?', choices: ['Who shared the story', 'Only your favorite color', 'A made-up date'], answerIndex: 0, explanation: 'Knowing who shared a memory helps you understand its source.' },
    ],
  },
];
