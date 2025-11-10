// foucs on better pormpt engineering to get better questions and better difficulty
export const GENERATE_CONTEXT_PROMPT = `

`;

export const SYSTEM_PROMPT_ARTICLE_SPECIFIC = `
You are a quiz-generation assistant.

Return ONLY valid JSON in this exact shape (no extra keys, no trailing commas, no malformed arrays):
{"questions":[{"question":"","options":["","","",""],"answer":0,"difficulty":"","explanation":""}]}

CRITICAL JSON RULES:
• Produce exactly {NUM_QUESTIONS} objects inside "questions".
• Each "options" array MUST contain exactly 4 complete, non-empty strings.
• DO NOT leave any array elements incomplete or cut off.
• "answer" is the 0-based index (0-3) of the correct option; ONLY 1 valid answer per question.
• Difficulty must be one of: easy, medium, hard, extreme.
• Base the questions ONLY on the context provided.
• "explanation" summarises the rationale in plain language (no line numbers).
• There should only be one question per object.
• Ensure all JSON syntax is correct - no missing commas, quotes, or brackets.

Context:
Topic: {TOPIC}
{BUCKET_A}
`;

//////// Summary Prompts ////////

export const USER_SUMMARY = `
 Produce exactly {NUM_QUESTIONS} EASY or MEDIUM multiple-choice questions that test recall and straightforward understanding of the passage.

Topic: {TOPIC}

Question rules:
• Difficulty must be "easy" or "medium" with more leaning towards medium.
• Base each question on a single clearly stated fact; no synthesis needed.
• Provide exactly 4 concise, plausible options; do not prefix with letters.
• Follow the global JSON rules described by the system prompt.
 • Keep each question ≤ 20 words.
 • Keep each option ≤ 8 words.
 • Keep each explanation ≤ 25 words.

Explanations:
• "explanation" paraphrases the supporting idea without referencing line numbers in plain language.

Return ONLY the JSON.
`;

export const USER_SUMMARY_COMPLEX = `
Produce exactly {NUM_QUESTIONS} MEDIUM or HARD multiple-choice questions requiring reasoning and the integration of multiple points in the passage.

Topic: {TOPIC}

Requirements:
• Difficulty must be "medium" or "hard".
• At least 2 questions must combine information from two or more distinct ideas in the passage.
• At least 1 question must use "NOT", "EXCEPT", or "LEAST".
• Focus on cause-effect, comparisons, inference, or synthesis.

Options:
• Provide exactly 4 concise, plausible options; no letter prefixes.

Explanations:
• "explanation" paraphrases the supporting idea without referencing line numbers in plain language.

Return ONLY the JSON.
`;

//////// Section Prompts ////////
// Edit prompt to NOT incorporate line numbers

export const USER_SECTION = `
 Produce exactly {NUM_QUESTIONS} EASY or MEDIUM multiple-choice questions that test recall and straightforward understanding of the following section.

Topic: {TOPIC}
Section: {SECTION_TITLE}

Question rules:
• Difficulty must be "easy" or "medium" with more leaning towards medium.
• Base each question on a single clearly stated fact; no synthesis needed.
• Provide exactly 4 concise, plausible options; do not prefix with letters.
• Follow the global JSON rules described by the system prompt.

Explanations:
• "explanation" paraphrases the supporting idea without referencing line numbers in plain language.

Return ONLY the JSON.
`;

export const USER_SECTION_COMPLEX = `
Produce exactly {NUM_QUESTIONS} MEDIUM or HARD multiple-choice questions requiring reasoning and the integration of multiple points in the following section.

Topic: {TOPIC}
Section: {SECTION_TITLE}


Requirements:
• Difficulty must be "medium" or "hard".
• At least 2 questions must combine information from two or more distinct ideas in the section.
• At least 1 question must use "NOT", "EXCEPT", or "LEAST".
• Focus on cause-effect, comparisons, inference, or synthesis.

Options:
• Provide exactly 4 concise, plausible options; no letter prefixes.

Explanations:
• "explanation" summarises the reasoning in plain language without referencing line numbers.

Return ONLY the JSON.
`;

export const USER_SUMMARY_EXTREME = `
Produce exactly {NUM_QUESTIONS} HARD or EXTREME multiple-choice questions that require maximum cognitive effort and deep analytical thinking.

Topic: {TOPIC}

Requirements:
• Difficulty must be "hard" or "extreme" ONLY.
• ALL questions must synthesize information from multiple parts of the passage.
• At least 2 questions must use "NOT", "EXCEPT", or "LEAST" format.
• At least 1 question must require inference about unstated consequences or motivations.
• Focus on complex cause-effect chains, contradictions, implicit relationships, and counter-intuitive insights.

Options:
• Provide exactly 4 sophisticated, plausible options that require careful analysis to distinguish.
• Distractors should be based on partial understanding or common misconceptions.

Explanations:
• "explanation" must detail the multi-step reasoning required to reach the answer without referencing line numbers.

Return ONLY the JSON.
`;

export const USER_SECTION_EXTREME = `
Produce exactly {NUM_QUESTIONS} HARD or EXTREME multiple-choice questions on the following section that require maximum cognitive effort and deep analytical thinking.

Topic: {TOPIC}
Section: {SECTION_TITLE}

Requirements:
• Difficulty must be "hard" or "extreme" ONLY.
• ALL questions must synthesize information from multiple parts of the section.
• At least 2 questions must use "NOT", "EXCEPT", or "LEAST" format.
• At least 1 question must require inference about unstated consequences or motivations.
• Focus on complex cause-effect chains, contradictions, implicit relationships, and counter-intuitive insights.

Options:
• Provide exactly 4 sophisticated, plausible options that require careful analysis to distinguish.
• Distractors should be based on partial understanding or common misconceptions.

Explanations:
• "explanation" must detail the multi-step reasoning required to reach the answer without referencing line numbers.

Return ONLY the JSON.
`

export const SYSTEM_PROMPT_CONTENT_REDUCER = `
You are a content reducer for quiz generation. Select the minimal subset of sentences from the list that preserves all information needed to create high‑quality quizzes (MCQ) without reducing quiz quality.

Selection criteria (keep if any apply):
- Definitions, key terms, core concepts
- Relationships, comparisons, cause‑effect, contrasts
- Steps/procedures, sequences, enumerations, taxonomies
- Exceptions, edge cases, common misconceptions
- Concrete facts: numbers, thresholds, formulas, dates, names
- Representative examples that enable plausible distractors

Rules:
- Do NOT rewrite or paraphrase; select exact sentences only.
- If two sentences duplicate meaning, keep the clearest, drop the rest.
- Prefer specificity over generality.
- Maintain original order in the final list.
- If you must choose, prioritize coverage of testable facts over narrative.

Output (compact):
Return ONLY JSON
`
// sepcify json format, tets to see how many credits are saved. If negligible, shorten this prompt or just stick with original method

export const CONTENT_REDUCER_PROMPT = `

Here is a numbered list of sentences. Select the minimal subset per the rules.

{BUCKET_A}
`;


export function fillPrompt(template: string, variables: Record<string, string>) {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{${key}}`, "g"), value);
  }
  return result;
}
