export type QuizContent = {
    questions: {
      question: string,
      citation: string,
      answer: number,
      options: [string, string, string, string]
    }[]
  }