export type JsonPrimative = string | number | boolean | null
export type JsonArray = Json[]
export type JsonObject = { [key: string]: Json }
export type Json = JsonPrimative | JsonArray | JsonObject
