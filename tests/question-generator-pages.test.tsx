import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  redirectMock,
  getSubjectTreeForUserMock,
  getTopicTreeForUserMock,
  questionCountMock,
  questionFindManyMock,
  getDueReviewCountMock,
  getDueReviewQuestionsMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn((location: string) => {
    throw new Error(`REDIRECT:${location}`);
  }),
  getSubjectTreeForUserMock: vi.fn(),
  getTopicTreeForUserMock: vi.fn(),
  questionCountMock: vi.fn(),
  questionFindManyMock: vi.fn(),
  getDueReviewCountMock: vi.fn(),
  getDueReviewQuestionsMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/tree/service", () => ({
  getSubjectTreeForUser: getSubjectTreeForUserMock,
  getTopicTreeForUser: getTopicTreeForUserMock,
}));

vi.mock("@/lib/review/service", () => ({
  getDueReviewCount: getDueReviewCountMock,
  getDueReviewQuestions: getDueReviewQuestionsMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    question: {
      count: questionCountMock,
      findMany: questionFindManyMock,
    },
  },
}));

vi.mock("@/app/actions/nodes", () => ({
  createNodeAction: vi.fn(),
}));

vi.mock("@/app/actions/questions", () => ({
  createQuestionAction: vi.fn(),
}));

vi.mock("@/app/components/question-list-item", () => ({
  QuestionListItem: () => null,
}));

vi.mock("@/app/components/subject-toc-sidebar", () => ({
  SubjectTocSidebar: () => null,
}));

vi.mock("@/app/components/question-generator-panel", () => ({
  QuestionGeneratorPanel: ({
    nodeId,
    targetLabel,
    returnTo,
  }: {
    nodeId: string;
    targetLabel: string;
    returnTo: string;
  }) => <div data-node-id={nodeId} data-target-label={targetLabel} data-return-to={returnTo} />,
}));

import SubjectPage from "@/app/subject/[subjectId]/page";
import TopicPage from "@/app/subject/[subjectId]/topic/[topicId]/page";

describe("node question generator page wiring", () => {
  const userId = "c12345678901234567890123";

  beforeEach(() => {
    vi.clearAllMocks();

    authMock.mockResolvedValue({
      user: {
        id: userId,
      },
    });
    questionCountMock.mockResolvedValue(0);
    questionFindManyMock.mockResolvedValue([]);
    getDueReviewCountMock.mockResolvedValue(0);
    getDueReviewQuestionsMock.mockResolvedValue([]);
  });

  it("targets the subject node on the subject page", async () => {
    getSubjectTreeForUserMock.mockResolvedValue({
      id: "subject-1",
      title: "Operating Systems",
      level: "SUBJECT",
      parentId: null,
      children: [],
    });

    const html = renderToStaticMarkup(
      await SubjectPage({
        params: Promise.resolve({ subjectId: "subject-1" }),
      }),
    );

    expect(html).toContain('data-node-id="subject-1"');
    expect(html).toContain('data-target-label="Operating Systems"');
    expect(html).toContain('data-return-to="/subject/subject-1"');
  });

  it("wires subject review to the current subject tree", async () => {
    getSubjectTreeForUserMock.mockResolvedValue({
      id: "subject-1",
      title: "Operating Systems",
      level: "SUBJECT",
      parentId: null,
      children: [],
    });
    getDueReviewCountMock.mockResolvedValue(3);
    getDueReviewQuestionsMock.mockResolvedValue([
      {
        reviewStateId: "review-1",
        questionId: "question-1",
        questionBody: "What is a process?",
        nodeId: "subject-1",
        nextReviewAt: new Date("2026-03-31T09:00:00.000Z"),
        status: "REVIEW",
      },
    ]);

    const html = renderToStaticMarkup(
      await SubjectPage({
        params: Promise.resolve({ subjectId: "subject-1" }),
      }),
    );

    expect(getDueReviewCountMock).toHaveBeenCalledWith(userId, "subject-1");
    expect(getDueReviewQuestionsMock).toHaveBeenCalledWith(userId, 1, "subject-1");
    expect(html).toContain(">3<");
    expect(html).toContain('href="/quiz/question-1?mode=review&amp;from=%2Fsubject%2Fsubject-1"');
    expect(html).toContain(">Start Review<");
  });

  it("targets the topic node when no subtopic is selected", async () => {
    getTopicTreeForUserMock.mockResolvedValue({
      subject: {
        id: "subject-1",
        title: "Operating Systems",
        level: "SUBJECT",
        parentId: null,
        children: [],
      },
      topic: {
        id: "topic-1",
        title: "Virtualization",
        level: "TOPIC",
        parentId: "subject-1",
        children: [],
      },
    });

    const html = renderToStaticMarkup(
      await TopicPage({
        params: Promise.resolve({ subjectId: "subject-1", topicId: "topic-1" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(html).toContain('data-node-id="topic-1"');
    expect(html).toContain('data-target-label="Operating Systems : Virtualization"');
    expect(html).toContain('data-return-to="/subject/subject-1/topic/topic-1"');
  });

  it("targets the selected subtopic when one is active", async () => {
    getTopicTreeForUserMock.mockResolvedValue({
      subject: {
        id: "subject-1",
        title: "Operating Systems",
        level: "SUBJECT",
        parentId: null,
        children: [],
      },
      topic: {
        id: "topic-1",
        title: "Virtualization",
        level: "TOPIC",
        parentId: "subject-1",
        children: [
          {
            id: "subtopic-1",
            title: "Paging",
            level: "SUBTOPIC",
            parentId: "topic-1",
            children: [],
          },
        ],
      },
    });

    const html = renderToStaticMarkup(
      await TopicPage({
        params: Promise.resolve({ subjectId: "subject-1", topicId: "topic-1" }),
        searchParams: Promise.resolve({ subtopic: "subtopic-1" }),
      }),
    );

    expect(html).toContain('data-node-id="subtopic-1"');
    expect(html).toContain('data-target-label="Operating Systems : Virtualization : Paging"');
    expect(html).toContain('data-return-to="/subject/subject-1/topic/topic-1?subtopic=subtopic-1"');
  });

  it("wires review to the active subtopic when one is selected", async () => {
    getTopicTreeForUserMock.mockResolvedValue({
      subject: {
        id: "subject-1",
        title: "Operating Systems",
        level: "SUBJECT",
        parentId: null,
        children: [],
      },
      topic: {
        id: "topic-1",
        title: "Virtualization",
        level: "TOPIC",
        parentId: "subject-1",
        children: [
          {
            id: "subtopic-1",
            title: "Paging",
            level: "SUBTOPIC",
            parentId: "topic-1",
            children: [],
          },
        ],
      },
    });
    getDueReviewCountMock.mockResolvedValue(2);
    getDueReviewQuestionsMock.mockResolvedValue([
      {
        reviewStateId: "review-2",
        questionId: "question-2",
        questionBody: "How does paging work?",
        nodeId: "subtopic-1",
        nextReviewAt: new Date("2026-03-31T09:00:00.000Z"),
        status: "LEARNING",
      },
    ]);

    const html = renderToStaticMarkup(
      await TopicPage({
        params: Promise.resolve({ subjectId: "subject-1", topicId: "topic-1" }),
        searchParams: Promise.resolve({ subtopic: "subtopic-1" }),
      }),
    );

    expect(getDueReviewCountMock).toHaveBeenCalledWith(userId, "subtopic-1");
    expect(getDueReviewQuestionsMock).toHaveBeenCalledWith(userId, 1, "subtopic-1");
    expect(html).toContain(">2<");
    expect(html).toContain(
      'href="/quiz/question-2?mode=review&amp;from=%2Fsubject%2Fsubject-1%2Ftopic%2Ftopic-1%3Fsubtopic%3Dsubtopic-1"',
    );
    expect(html).toContain(">Start Review<");
  });
});
