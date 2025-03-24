export interface FileUploadResponse {
    id: string;
    name: string;
    type: string;
    preview: string;
  }
  
  export interface ChatMessage {
    id: string;
    message: string;
    response: string;
    createdAt: string;
  }