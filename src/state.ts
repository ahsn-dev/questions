import {
  Answer,
  AnsweredQuestion,
  makeQuestions,
  Question,
  QuestionItem,
} from "./questions";
import { AsyncReducer, noEffects } from "./hooks/useAsyncReducer";
import { delay } from "./utils";
import confetti from "canvas-confetti";

export type State = {
  questionItems: Array<QuestionItem>;
  gameState: GameState;
};

export type GameState = GameInProgressState | GameEndState;

export interface GameBeforeStartState {
  tag: "before_start";
}

export interface GameInProgressState {
  tag: "in_progress";
  answeredQuestions: Array<AnsweredQuestion>;
  currentQuestion: Question;
  currentAnswer?: Answer;
  nextQuestions: Array<Question>;
}

export interface GameEndState {
  tag: "ended";
  answeredQuestions: Array<AnsweredQuestion>;
}

export type Action =
  | { tag: "answer"; answer: Answer }
  | { tag: "next_question" }
  | { tag: "start_game" }
  | { tag: "new_game"; questions: Array<Question> };

export const answerAction = (answer: Answer): Action => ({
  tag: "answer",
  answer,
});
export const nextQuestionAction: Lazy<Action> = () => ({
  tag: "next_question",
});
export const startGameAction: Lazy<Action> = () => ({ tag: "start_game" });
export const newGameAction = (questions: Array<Question>): Action => ({
  tag: "new_game",
  questions,
});

export function initState(questionItems: Array<QuestionItem>): State {
  const numQuestions = 6;
  const [firstQuestion, ...restQuestions] = makeQuestions(
    numQuestions,
    questionItems
  );
  const gameState: GameState = {
    tag: "in_progress",
    answeredQuestions: [],
    currentQuestion: firstQuestion,
    currentAnswer: undefined,
    nextQuestions: restQuestions,
  };

  return {
    questionItems,
    gameState,
  };
}

function nextQuestion(isAnswerCorrect: boolean): Lazy<Promise<Array<Action>>> {
  return async () => {
    if (isAnswerCorrect) confetti();
    await delay(1500);
    return [nextQuestionAction()];
  };
}

function newGame(data: Array<QuestionItem>): Lazy<Promise<Array<Action>>> {
  return async () => {
    const numQuestions = 6;
    const questions = makeQuestions(numQuestions, data);
    return [newGameAction(questions)];
  };
}

export const reducer: AsyncReducer<State, Action> = (state, action) => {
  if (action.tag === "start_game") {
    return { state, effects: [newGame(state.questionItems)] };
  }

  if (action.tag === "new_game") {
    const [firstQuestion, ...restQuestions] = action.questions;
    const gameState: GameState = {
      tag: "in_progress",
      answeredQuestions: [],
      currentQuestion: firstQuestion,
      currentAnswer: undefined,
      nextQuestions: restQuestions,
    };
    return noEffects({ ...state, gameState });
  }

  if (action.tag === "answer") {
    if (state.gameState.tag === "ended") return noEffects(state);
    if (state.gameState.currentAnswer !== undefined) return noEffects(state); // already answered

    const newState = {
      ...state,
      gameState: { ...state.gameState, currentAnswer: action.answer },
    };

    return {
      state: newState,
      effects: [
        nextQuestion(
          action.answer === state.gameState.currentQuestion.correctOption
        ),
      ],
    };
  }

  if (action.tag === "next_question") {
    if (state.gameState.tag === "ended") return noEffects(state);
    if (state.gameState.currentAnswer === undefined) return noEffects(state); // not answered yet!!

    const answeredQuestion: AnsweredQuestion = {
      question: state.gameState.currentQuestion,
      answer: state.gameState.currentAnswer,
    };
    const answeredQuestions = [
      answeredQuestion,
      ...state.gameState.answeredQuestions,
    ];
    if (state.gameState.nextQuestions.length <= 0) {
      // end of game
      return noEffects({
        ...state,
        gameState: { answeredQuestions, tag: "ended" },
      });
    }
    const [head, ...tail] = state.gameState.nextQuestions;
    const newGameState = {
      ...state.gameState,
      answeredQuestions,
      currentQuestion: head,
      currentAnswer: undefined,
      nextQuestions: tail,
    };
    return noEffects({ ...state, gameState: newGameState });
  }

  return { state: state, effects: [] };
};
