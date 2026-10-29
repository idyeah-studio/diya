/**
 * What a complete Get code file draws for the app components a snippet
 * leaves to you. DIYA ships no icon set, so each icon is one plain SVG
 * path (24 × 24, stroked), and tab or step content is a short paragraph.
 */
export const ICON_PATHS: Record<string, string> = {
  ActivityIcon: 'M3 12h4l3-8 4 16 3-8h4',
  ArrowIcon: 'M5 12h14m-6-6 6 6-6 6',
  BellIcon: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2Zm4 4h4',
  CheckIcon: 'm5 12 5 5 9-10',
  CopyIcon: 'M9 9h11v11H9zM5 15H4V4h11v1',
  EditIcon: 'M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4',
  FileIcon: 'M6 3h8l4 4v14H6zM14 3v4h4',
  FolderIcon: 'M3 6h6l2 2h10v11H3z',
  GridIcon: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  HelpIcon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-2.5-11.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14m0 3v.5',
  InfoIcon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-10v6m0-9v.5',
  LayersIcon: 'm12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
  LinkIcon: 'M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1m-2 8a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1',
  MoreIcon: 'M5 12h.01M12 12h.01M19 12h.01',
  PlusIcon: 'M12 5v14M5 12h14',
  SettingsIcon: 'M4 7h10m4 0h2M4 17h2m4 0h10M14 4v6m-4 4v6',
  TrashIcon: 'M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13',
  UsersIcon: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-6 9a6 6 0 0 1 12 0m1-9a3 3 0 1 0 0-6m2 15h3a5 5 0 0 0-5-5',
}

/** Placeholder content for tab panels and wizard steps. */
export const CONTENT_TEXT: Record<string, string> = {
  ProjectOverview: 'Three milestones left before launch.',
  ProjectActivity: 'Two updates since yesterday.',
  ProjectFiles: 'The brief and the research notes.',
  ProjectDetails: 'Name the project and choose who owns it.',
  ProjectPreferences: 'Choose who gets updates and how often.',
  ProjectReview: 'Check the details, then create the project.',
}

export const isIcon = (name: string) => Object.hasOwn(ICON_PATHS, name)
