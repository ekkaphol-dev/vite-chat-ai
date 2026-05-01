export type Role = "user" | "assistant";

export type Message = {
  id: string;
  role: Role;
  content: string;
  time: string;
  sources?: WebSource[];
};

export type WebSource = {
  title: string;
  url: string;
  domain: string;
  trusted: boolean;
};

export type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

export type Theme = "light" | "dark" | "system";
