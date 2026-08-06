declare namespace CordovaHttp {
  interface HttpResponse {
    status: number;
    data: string;
    headers: any;
    url: string;
  }

  interface HttpError {
    status: number;
    error: any;
  }

  interface BaseHttpOptions {
    method: string;
    params?: any;
    headers?: any;
  }

  export interface GetOptions extends BaseHttpOptions {
    method: "get";
  }

  export interface PostOptions extends BaseHttpOptions {
    method: "post";
    params?: any;
    headers?: any;
    data: any;
  }

  export interface UploadFileOptions extends BaseHttpOptions {
    method: "upload";
    filePath: string;
    name: string;
  }

  export interface DownloadFileOptions extends BaseHttpOptions {
    method: "download";
    filePath: string;
  }

  type HttpOptions = GetOptions | PostOptions | UploadFileOptions | DownloadFileOptions;

  interface Http {
    get(url: string, params: any, headers: any, success: (response: HttpResponse) => void, failure: (error: HttpError) => void): void;

    post(url: string, params: any, headers: any, success: (response: HttpResponse) => void, failure: (error: HttpError) => void): void;

    sendRequest(url: string, options: HttpOptions, success: (response: HttpResponse) => void, failure: (error: HttpError) => void): void;

    downloadFile(url: string, params: any, headers: any, filePath: string, success: (response: FileEntry) => void, failure: (error: HttpError) => void): any;

    uploadFile(url: string, params: any, headers: any, filePath: string, name: string, success: (response: HttpResponse) => void, failure: (error: HttpError) => void): any;

    setRequestTimeout(timeInSec: number);

    setDataSerializer(serializer: "json" | "urlencoded" | "utf8" | "multipart"): void;

    clearCookies(): void;
  }
}

interface CordovaPlugins {
  http: CordovaHttp.Http;
}

interface Cordova {
  plugin: CordovaPlugins;
}

declare var cordova: Cordova;

interface Navigator {
  app: {
    exitApp: () => void;
  };
}
