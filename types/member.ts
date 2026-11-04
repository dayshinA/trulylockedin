// members/{uid}: uid is the Firebase Auth uid. Timestamps are ISO strings.
export type Member = {
  uid: string;
  name: string;
  // Copied from the Auth account on every sign-in, so it stays current.
  email: string;
  // Saved from the member's latest booking to prefill the next one.
  phone?: string;
  createdAt: string;
  updatedAt: string;
};

// What the browser is told about the signed-in member.
export type MemberProfile = Pick<Member, "name" | "email" | "phone">;
