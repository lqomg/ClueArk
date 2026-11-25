import {
  ENTITY_HIT_MIN_SEMANTIC,
  candidateRecallFloor,
  decideAdmission,
  textHardHitsCoreEntities,
} from './admission.util';

describe('admission.util', () => {
  it('admits semantic_high when score >= minCosine', () => {
    const d = decideAdmission({
      minCosine: 0.43,
      title: 'Something unrelated',
      entities: ['AlphaCorp'],
      precomputedSemanticScore: 0.5,
    });
    expect(d.admitted).toBe(true);
    if (d.admitted) {
      expect(d.reasons).toContain('semantic_high');
    }
  });

  it('admits entity hit only with semantic floor', () => {
    const hit = decideAdmission({
      minCosine: 0.8,
      title: 'AlphaCorp launches new chip',
      entities: ['AlphaCorp'],
      precomputedSemanticScore: ENTITY_HIT_MIN_SEMANTIC,
    });
    expect(hit.admitted).toBe(true);
    if (hit.admitted) {
      expect(hit.reasons).toContain('entity_keyword_hit');
    }

    const miss = decideAdmission({
      minCosine: 0.8,
      title: 'AlphaCorp launches new chip',
      entities: ['AlphaCorp'],
      precomputedSemanticScore: ENTITY_HIT_MIN_SEMANTIC - 0.01,
    });
    expect(miss.admitted).toBe(false);
  });

  it('detects CJK entity hard hits', () => {
    expect(textHardHitsCoreEntities('华为发布新机', ['华为'])).toBe(true);
    expect(textHardHitsCoreEntities('无关新闻', ['华为'])).toBe(false);
  });

  it('candidateRecallFloor never exceeds minCosine', () => {
    expect(candidateRecallFloor(0.5)).toBe(ENTITY_HIT_MIN_SEMANTIC);
    expect(candidateRecallFloor(0.2)).toBe(0.2);
  });
});
