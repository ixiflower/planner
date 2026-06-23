export type UserType = "Leader" | "Mod" | "Member"

export type TeamUser = {
  id: string
  name: string
  role: string
  type: UserType
  avatarUrl?: string
}

import { userPictures } from "@/data/pictures"

export const users: TeamUser[] = [
  { id: "u1", name: "Ava Reed", role: "Team Lead", type: "Leader", avatarUrl: userPictures["u1"] },
  { id: "u2", name: "Noah Park", role: "Team Lead", type: "Leader", avatarUrl: userPictures["u2"] },
  { id: "u3", name: "Liam Chen", role: "Second Lead", type: "Mod", avatarUrl: userPictures["u3"] },
  { id: "u4", name: "Mia Khan", role: "Second Lead", type: "Mod", avatarUrl: userPictures["u4"] },
  { id: "u5", name: "Ethan Cruz", role: "Second Lead", type: "Mod", avatarUrl: userPictures["u5"] },
  { id: "u6", name: "Zoe Li", role: "Developer", type: "Member", avatarUrl: userPictures["u6"] },
  { id: "u7", name: "Kai Patel", role: "Designer", type: "Member", avatarUrl: userPictures["u7"] },
  { id: "u8", name: "Ivy Nguyen", role: "Developer", type: "Member", avatarUrl: userPictures["u8"] },
  { id: "u9", name: "Owen Kim", role: "Analyst", type: "Member", avatarUrl: userPictures["u9"] },
  { id: "u10", name: "Ruby Singh", role: "QA", type: "Member", avatarUrl: userPictures["u10"] },
]