import handler from "./api/index";

export default {
  async fetch(req: Request, env: any, ctx: any): Promise<Response> {
    return handler(req);
  }
};
