import { PublicCatalogContext } from './public-catalog-context';

describe('public catalog metadata', () => {
  it('keeps only bounded public descriptions, replacing older content', () => {
    const context = new PublicCatalogContext();
    const entry = { id: 'one', title: 'A'.repeat(130), description: 'B'.repeat(600), answers: ['private'], createdBy: 'teacher' };
    context.replace('questions', [entry]);
    expect(context.entries()).toEqual([{ id: 'one', kind: 'questions', title: 'A'.repeat(120), description: 'B'.repeat(500) }]);
    context.replace('questions', []);
    expect(context.entries()).toEqual([]);
  });
});
