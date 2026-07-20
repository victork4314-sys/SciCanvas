export type Geometry = { x:number; y:number; w:number; h:number; rotation:number };

export type FigureObject = {
  id:string;
  type:string;
  name?:string;
  x:number;
  y:number;
  width:number;
  height:number;
  rotation?:number;
  opacity?:number;
  visible?:boolean;
  locked?:boolean;
  fill?:string;
  stroke?:string;
  strokeWidth?:number;
  text?:string;
  richText?:unknown;
  src?:string;
  svgSource?:string;
  asset?:string;
  groupId?:string;
  fromId?:string;
  toId?:string;
  metadata?:Record<string, unknown>;
  [key:string]:unknown;
};

export type FigurePage = {
  id:string;
  name:string;
  objects:FigureObject[];
  background?:Record<string, unknown> | null;
  notes?:string;
};

export type FigureProject = {
  format:'FigureLoom';
  version:number;
  id:string;
  title:string;
  pages:FigurePage[];
  activePage:number;
  projectSize:{ width:number; height:number; widthMm?:number; heightMm?:number };
  metadata:Record<string, unknown>;
  savedAt?:string;
};

export type CommandDescriptor = {
  name:string;
  description:string;
  category:string;
  write:boolean;
  destructive:boolean;
  inputSchema?:Record<string, unknown>;
};

export type BrowserHello = {
  type:'browser_hello';
  protocol:number;
  token:string;
  app:{ name:string; version:string };
  access:{ mode:'read'|'full'; destructive:boolean; currentProject:boolean };
  project:{ id:string; title:string; persisted:boolean; pageCount:number };
  commands:CommandDescriptor[];
};

export type BrowserConnectionInfo = {
  id:string;
  appName:string;
  appVersion:string;
  projectId:string;
  projectTitle:string;
  access:'read'|'full';
  destructive:boolean;
  currentProject:boolean;
  commands:CommandDescriptor[];
  connectedAt:string;
};

export type WorkspaceTarget = 'scratch'|'current';

export type SessionInfo = {
  id:string;
  clientName:string;
  transport:'stdio'|'http';
  workspace:WorkspaceTarget;
  access:'read'|'full';
  createdAt:string;
};

export type CommandContext = {
  sessionId:string;
  readOnly:boolean;
  allowDestructive:boolean;
};

export type RenderResult = {
  mimeType:string;
  data:string;
  encoding:'utf8'|'base64';
  width?:number;
  height?:number;
};