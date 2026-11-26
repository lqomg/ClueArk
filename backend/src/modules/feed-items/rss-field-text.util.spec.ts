import {
  pickRssSummaryFieldText,
  rssFieldLink,
  rssFieldText,
} from './rss-field-text.util';

describe('pickRssSummaryFieldText', () => {
  it('prefers Product Hunt content tagline over Discussion|Link snippet', () => {
    const picked = pickRssSummaryFieldText({
      contentSnippet: 'Discussion\n            |\n            Link',
      content: `          <p>
            Blender, Unity or Unreal to a live 3D link in one click
          </p>
          <p>
            <a href="https://www.producthunt.com/products/x">Discussion</a>
            |
            <a href="https://www.producthunt.com/r/p/1">Link</a>
          </p>
`,
    });
    expect(picked).toContain('Blender, Unity or Unreal');
    expect(picked).not.toMatch(/^(Discussion\s*\|\s*Link)$/i);
  });

  it('falls back to contentSnippet when it is the only field', () => {
    expect(pickRssSummaryFieldText({ contentSnippet: 'Short blurb about a launch' })).toBe(
      'Short blurb about a launch',
    );
  });

  it('skips nav-only snippet when a richer field exists', () => {
    expect(
      pickRssSummaryFieldText({
        contentSnippet: 'Discussion | Link',
        summary: 'An indie tool for shipping faster',
      }),
    ).toBe('An indie tool for shipping faster');
  });
});

describe('rssFieldText', () => {
  it('returns trimmed strings', () => {
    expect(rssFieldText('  hello  ')).toBe('hello');
  });

  it('extracts text from xml2js _ node', () => {
    expect(rssFieldText({ _: 'Atlantic headline', $: { href: '/path' } })).toBe('Atlantic headline');
  });

  it('extracts text from Fierce Biotech title shape', () => {
    const title = {
      a: [
        {
          _: 'Chutes & Ladders—Perrigo CEO ousted',
          $: { href: '/biotech/chutes-ladders', hreflang: 'en' },
        },
      ],
    };
    expect(rssFieldText(title)).toBe('Chutes & Ladders—Perrigo CEO ousted');
  });

  it('joins array segments', () => {
    expect(rssFieldText(['part1', 'part2'])).toBe('part1 part2');
  });

  it('handles nullish', () => {
    expect(rssFieldText(null)).toBe('');
    expect(rssFieldText(undefined)).toBe('');
  });
});

describe('rssFieldLink', () => {
  it('returns string links', () => {
    expect(rssFieldLink('https://example.com/post')).toBe('https://example.com/post');
  });

  it('extracts href from anchor object', () => {
    expect(
      rssFieldLink({
        a: [{ _: 'title', $: { href: '/biotech/story', hreflang: 'en' } }],
      }),
    ).toBe('/biotech/story');
  });
});
