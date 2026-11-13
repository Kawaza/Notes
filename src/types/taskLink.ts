export type TaskLinkSuggestion = {
  /** Workspace task UUID or personal task note id */
  id: string;
  title: string;
  folderId: string;
  kind: 'workspace' | 'personal';
};
