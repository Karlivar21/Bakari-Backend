import Mailjet from "node-mailjet";

export const mailjet = Mailjet.apiConnect(
  process.env.MJ_PUBLIC,
  process.env.MJ_PRIVATE
);
