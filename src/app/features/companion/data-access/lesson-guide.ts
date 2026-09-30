import { Injectable } from '@angular/core';
import type { GuideAnswer } from '../models/guide-message';
import { COMPANION_CONFIG } from '../companion.config';

const STOP_WORDS = new Set('a an the and or to of in on at is are was were be been it its this that these those i my me you your our we us can could do does did will would should how what why when where who which tell explain about please help more know learn learning lesson lessons some with for from'.split(' '));

function words(text: string): string[] {
  return [...new Set((text.toLowerCase().match(/[a-z]+/g) ?? [])
    .filter(word => word.length > 2 && !STOP_WORDS.has(word))
    .map(word => word.length > 4 && word.endsWith('s') ? word.slice(0, -1) : word))];
}

/** Retrieves relevant passages from the same sample content shown by the pages. */
@Injectable({ providedIn: 'root' })
export class LessonGuide {
  async answer(question: string, currentLessonId?: string): Promise<GuideAnswer> {
    const query = question.toLowerCase().trim();
    const plain = query.replace(/[^a-z\s]/g, '').trim();
    const say = (text: string): GuideAnswer => ({ text, sources: [] });

    if (/^(hi|hello|hey|thanks|thank you|who are you)$/.test(plain)) {
      return say(`Hello, explorer! I’m ${COMPANION_CONFIG.name}. I can find ideas in our history and geography lessons, or help you use this app. Try asking “What is a map key?”`);
    }
    if (/\b(account|login|log in|sign in|password|sign up)\b/.test(query)) {
      return say('You don’t need an account. Choose a lesson, explore its activities, and try the quick check at the end.');
    }
    if (/\b(quiz|quizzes|score|scores|check answers)\b/.test(query)) {
      return say('Open any lesson and scroll to “What did you discover?”. Choose one answer for each question, then select “Check answers”. You’ll see explanations and can try again. Your quiz answers reset when you reload or change lessons.');
    }
    if (/\b(save|saved|remember|progress)\b/.test(query)) {
      return say('Your quiz answers and our conversation aren’t saved between visits. Only my hidden/shown setting and screen position are remembered on this browser.');
    }
    if (/\b(hide|move|position|voice|speak|listen|gif|character)\b/.test(query)) {
      return say(`Use Hide to tuck me away, then “Show ${COMPANION_CONFIG.name}” to bring me back. The arrow button moves me to the other corner. Choose Listen below one of my answers to hear it, and Stop to end the reading.`);
    }
    if (/^(help|what can you do|what is this app|how do i use this app|how do i start)$/.test(plain) || /\b(website|project|app)\b/.test(query)) {
      return say('Our Place helps you explore local history and geography. Start with “Explore lessons”, filter by History or Geography, or search for a topic. Each sample lesson includes ideas, activities, and a quick quiz. We haven’t added a real town’s history yet.');
    }

    const { SAMPLE_LESSONS } = await import('../../lessons/data/sample-lessons');
    const currentLesson = SAMPLE_LESSONS.find(lesson => lesson.id === currentLessonId);
    if (/\b(this lesson|current lesson|what am i learning)\b/.test(query) && currentLesson) {
      return {
        text: `${currentLesson.title}: ${currentLesson.subtitle} You’ll learn to ${currentLesson.learningGoals.map(goal => goal.toLowerCase()).join(', ')}.`,
        sources: [{ lessonId: currentLesson.id, title: currentLesson.title }],
      };
    }

    // Sample lessons cannot establish dates, identities, or facts about a real town.
    if (/\b(my town|my city|my village|my province|our town|our city|our village|who built|who founded|what year|which year|when was|when did)\b/.test(query)) {
      return say('I don’t have verified facts about your town yet. Our lessons are examples. A local museum, a trusted adult, or a reliable local source can help with names and dates. I can explain how to look for historical clues.');
    }

    const tokens = words(question);
    const passages = SAMPLE_LESSONS.flatMap(lesson => [
      ...lesson.sections.map(section => ({ lesson, heading: section.heading, text: section.body })),
      ...lesson.quiz.map(quiz => ({ lesson, heading: quiz.prompt, text: quiz.explanation })),
    ]);
    const ranked = passages.map(passage => {
      const heading = new Set(words(passage.heading));
      const body = new Set(words(passage.text));
      const title = new Set(words(passage.lesson.title));
      const categoryMatch = tokens.includes(passage.lesson.category.toLowerCase()) ? 1 : 0;
      const matches = tokens.filter(token => heading.has(token) || body.has(token) || title.has(token));
      const score = matches.reduce((total, token) => total + (heading.has(token) ? 3 : body.has(token) ? 2 : 1), categoryMatch);
      return { ...passage, score, matches: matches.length };
    }).filter(passage => passage.matches > 0 || passage.score > 0)
      .sort((a, b) => b.score - a.score || Number(b.lesson.id === currentLessonId) - Number(a.lesson.id === currentLessonId));

    const best = ranked[0];
    // A shared topic word alone does not establish an answer to a more specific question.
    if (!best || (tokens.length > 1 && best.matches / tokens.length < 0.6)) {
      return say('I couldn’t find that in our sample lessons. I can help with maps, changing places, water, landmarks, or using the app. Try “Where does rainwater go?” or open a lesson and ask “Explain this lesson”.');
    }

    return {
      text: `Here’s a passage from “${best.lesson.title}” that may help:\n\n${best.text}`,
      sources: [{ lessonId: best.lesson.id, title: best.lesson.title }],
    };
  }
}
