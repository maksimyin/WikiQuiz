export const WIKI_META_SECTION_TITLES: string[] = [
    "References",
    "Notes",
    "Notes and references",
    "References and notes",
    "Citations",
    "Footnotes",
    "Endnotes",
    "Works cited",
    "Bibliography",
    "Sources",
    "Primary sources",
    "Secondary sources",
    "General references",
    "General sources",
    "See also",
    "Further reading",
    "Additional reading",
    "Further information",
    "External links",
    "External link",
    "External resources",
    "External websites",
    "References and external links",
    "External links and references",
    "Notes and sources",
    "Appendix",
    "Appendices",
    "Explanatory notes",
    "Other websites",
  ];

export const SELECTORS = [
    // Skip infoboxes, sidebars, navboxes, and ToC
    { selector: 'table.infobox', format: 'skip' },
    { selector: '.infobox', format: 'skip' },
    { selector: 'table.vertical-navbox', format: 'skip' },
    { selector: '.vertical-navbox', format: 'skip' },
    { selector: 'table.sidebar', format: 'skip' },
    { selector: '.sidebar', format: 'skip' },
    { selector: 'table.navbox', format: 'skip' },
    { selector: '.navbox', format: 'skip' },
    { selector: '#toc', format: 'skip' },
    { selector: '.toc', format: 'skip' },
    // General cleanups and misc templates
    { selector: '.mw-editsection', format: 'skip' },
    { selector: '.reference', format: 'skip' },
    { selector: '.error', format: 'skip' },
    { selector: '.mw-empty-elt', format: 'skip' },
    { selector: '.reflist', format: 'skip' },
    { selector: '.navbox', format: 'skip' },
    { selector: '.infobox', format: 'skip' },
    { selector: '.hatnote', format: 'skip' },
    { selector: '.citation', format: 'skip' },
    { selector: 'sup', format: 'skip' },
    { selector: '.printfooter', format: 'skip' },
    { selector: '.catlinks', format: 'skip' },
    { selector: '.thumbinner', format: 'skip' },
    { selector: '.thumb', format: 'skip' },
    { selector: '.thumbcaption', format: 'skip' },
    { selector: '.caption', format: 'skip' },
    { selector: '.gallery', format: 'skip' },
    { selector: 'img', format: 'skip' },
    { selector: '.mw-references-wrap', format: 'skip' },
    { selector: 'figcaption', format: 'skip' },
    { selector: '.magnify', format: 'skip' },
    { selector: '.internal', format: 'skip' },
    { selector: '.image-caption', format: 'skip' },
    { selector: '.gallerytext', format: 'skip' },
    { selector: '.shortdescription', format: 'skip' },
    { selector: '.metadata', format: 'skip' },
    { selector: '.sistersitebox', format: 'skip' },
    { selector: '.rellink', format: 'skip' },
    { selector: '.ambox', format: 'skip' },
    { selector: '.mbox', format: 'skip' },
    { selector: 'a', format: 'inline', options: { ignoreHref: true } }
  ]



// Normalize titles for reliable comparison
const normalizeTitle = (title: string): string =>
  title
    .toLowerCase()
    .replace(/<[^>]*>?/g, '') // remove any residual tags
    .replace(/\[[^\]]*\]/g, '') // remove bracketed edit markers if present
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // remove punctuation
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();

export const isMetaSection = (title: string) => {
  const normalized = normalizeTitle(title);

  // Exact matches against normalized set
  const exactSet = new Set(WIKI_META_SECTION_TITLES.map(t => normalizeTitle(t)));
  if (exactSet.has(normalized)) return true;

  // Keyword-based matching to catch variants/combinations
  const keywordFragments = [
    'reference',
    'footnote',
    'endnote',
    'citation',
    'bibliograph',
    'source',
    'see also',
    'external link',
    'further reading',
    'works cited',
    'appendix',
    'explanatory notes',
    'other websites'
  ];

  return keywordFragments.some(fragment => normalized.includes(fragment));
}


export const schema = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: {
            type: "string",
            description: "The quiz question text",
            minLength: 1
          },
          options: {
            type: "array",
            items: {
              type: "string",
              description: "A possible answer option",
              minLength: 1
            },
            minItems: 4,
            maxItems: 4,
            description: "Array of exactly 4 answer choices"
          },
          answer: {
            type: "integer",
            minimum: 0,
            maximum: 3,
            description: "Index of the correct answer (0-3)"
          },
          citation: {
            type: "string",
            description: "Source citation for the question",
            minLength: 1
          },
          difficulty: {
            type: "string",
            enum: ["easy", "medium", "hard", "extreme"],
            description: "Difficulty level of the question"
          },
          explanation: {
            type: "string",
            description: "Explanation of why the answer is correct",
            minLength: 1
          }
        },
        required: ["question", "options", "answer", "citation", "difficulty", "explanation"],
        additionalProperties: false
      },
      minItems: 1,
      maxItems: 1,
      description: "Array containing exactly 1 quiz question"
    }
  },
  required: ["questions"],
  additionalProperties: false,
  description: "Schema for quiz data structure with single question and answers"
}