export type MemberCalendarBlock = {
  id: string;
  ownerUserId: string;
  title: string;
  content: string;
  contentType: 'html' | 'markdown';
  scheduledAt: string;
  scheduledEnd?: string;
  calendarColor?: string;
  linkedTaskId?: string | null;
  order: number;
  updatedAt: string;
  createdAt: string;
};

export type MemberCalendarBlockPatch = Partial<
  Pick<
    MemberCalendarBlock,
    | 'title'
    | 'content'
    | 'contentType'
    | 'scheduledAt'
    | 'scheduledEnd'
    | 'calendarColor'
    | 'linkedTaskId'
    | 'order'
  >
>;