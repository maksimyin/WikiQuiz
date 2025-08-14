export const SYSTEM_PROMPT = `
You are a quiz-generation assistant. Output ONLY valid JSON in this format:
{"questions":[{"question":"","options":["","","",""],"answer":index # of correct option as a number not string (0-3),"citation":"", "difficulty":"", "explanation":""}]} 
Don't include A. B. C. D. in front of options or anything other than the information asked for
Difficulty is measured on: easy, medium, hard, or extreme
Make sure you ONLY return 5 valid JSON objects inside the questions array and nothing else


Bucket A (Context):
{BUCKET_A}

Bucket B (Outside-Facts):
– Add 1-2 basic, well-known facts about {TOPIC} if relevant
– Must be simple and widely known
- Leave Empty if uncertain
– Cite as "G"
`;

// foucs on better pormpt engineering to get better questions and better difficulty
export const SYSTEM_PROMPT_ARTICLE_SPECIFIC = `
You are a quiz-generation assistant. Output ONLY valid JSON in this format:
{"questions":[{"question":"","options":["","","",""],"answer":index # of correct option as a number not string (0-3),"citation":"", "difficulty":"", "explanation":""}]}
Don't include A. B. C. D. in front of options or anything other than the information asked for
Difficulty is measured on: easy, medium, hard, or extreme
Make sure you ONLY return 5 valid JSON objects inside the questions array and nothing else

Topic: {TOPIC}
{BUCKET_A}
`

//////// Summary Prompts ////////

export const SUMMARY_PROMPT_USER = `
Topic: {TOPIC}

Generate 5 multiple-choice questions that:
• Test a deep-level understanding of the passage
• Have 4 clear, concise options
• Challenge users to require critical thinking
• Cite sources as ONLY line numbers (1,2,3, etc.)
Output ONLY the JSON.
`;

export const SUMMARY_COMPLEX_PROMPT_USER = `
Topic: {TOPIC}
Generate 5 challenging multiple-choice questions following these rules:

Question Requirements:
• At least 2 questions must combine facts from multiple lines
• At least 1 question must use the "Which is NOT" or "EXCEPT" format
• Questions should test relationships and understanding, not just recall

Answer Options Requirements:
• All options must be plausible and educational
• Options should be consice
• Wrong answers should be logical distractors

Citations:
• Use line numbers for Bucket A facts
• Use "G" for outside knowledge
• If combining multiple sources, list all (e.g., "1, G")

Focus on:
• Cause and effect relationships
• Technical or scientific reasoning
• Historical context and implications
• Program evolution and development
• Engineering challenges and solutions
Output ONLY the JSON.
`

//////// Section Prompts ////////

export const SECTION_PROMPT_USER = `
Topic: {TOPIC}
Section: {SECTION_TITLE}

Generate 5 multiple-choice questions that:
• Focus specifically on this section's content and details
• Test understanding of section-specific concepts and information
• Have 4 clear, concise options per question
• Use only information from the provided section content
• Cite sources as ONLY line numbers (1,2,3, etc.) from the section
• Force Analytical Thinking

Output ONLY the JSON.
`;




export function fillPrompt(template: string, variables: Record<string, string>) {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{${key}}`, "g"), value);
  }
  return result;
}
