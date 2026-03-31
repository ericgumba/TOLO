import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  redirectMock,
  getSubjectTreeForUserMock,
  getTopicTreeForUserMock,
  questionCountMock,
  questionFindManyMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn((location: string) => {
    throw new Error(`REDIRECT:${location}`);
  }),
  getSubjectTreeForUserMock: vi.fn(),
  getTopicTreeForUserMock: vi.fn(),
  questionCountMock: vi.fn(),
  questionFindManyMock: vi.fn(),
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
});
