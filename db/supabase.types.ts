export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[]

export type Database = {
	public: {
		Tables: {
			candidate_urls: {
				Row: {
					crawl_url: string
					errored: boolean
					processed: boolean
				}
				Insert: {
					crawl_url: string
					errored?: boolean
					processed?: boolean
				}
				Update: {
					crawl_url?: string
					errored?: boolean
					processed?: boolean
				}
				Relationships: []
			}
			deployments: {
				Row: {
					created_at: string
					deployment_url: string | null
					id: string
					log_url: string | null
					project_id: string
					status: string
					updated_at: string
				}
				Insert: {
					created_at?: string
					deployment_url?: string | null
					id: string
					log_url?: string | null
					project_id: string
					status: string
					updated_at?: string
				}
				Update: {
					created_at?: string
					deployment_url?: string | null
					id?: string
					log_url?: string | null
					project_id?: string
					status?: string
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: "deployments_project_id_projects_id_fk"
						columns: ["project_id"]
						isOneToOne: false
						referencedRelation: "projects"
						referencedColumns: ["id"]
					},
				]
			}
			events: {
				Row: {
					event_id: string
					event_name: string
					payload: Json | null
					timestamp: string
					user_id: string | null
				}
				Insert: {
					event_id?: string
					event_name: string
					payload?: Json | null
					timestamp?: string
					user_id?: string | null
				}
				Update: {
					event_id?: string
					event_name?: string
					payload?: Json | null
					timestamp?: string
					user_id?: string | null
				}
				Relationships: []
			}
			github_installations: {
				Row: {
					installation_id: string
					installed_at: string
					setup_action: string | null
					user_id: string
				}
				Insert: {
					installation_id: string
					installed_at: string
					setup_action?: string | null
					user_id: string
				}
				Update: {
					installation_id?: string
					installed_at?: string
					setup_action?: string | null
					user_id?: string
				}
				Relationships: []
			}
			pr_queue: {
				Row: {
					checked: boolean
					created_at: string | null
					errored: boolean
					pr_url: string | null
					processed: boolean
					server_id: string
				}
				Insert: {
					checked?: boolean
					created_at?: string | null
					errored?: boolean
					pr_url?: string | null
					processed?: boolean
					server_id: string
				}
				Update: {
					checked?: boolean
					created_at?: string | null
					errored?: boolean
					pr_url?: string | null
					processed?: boolean
					server_id?: string
				}
				Relationships: []
			}
			projects: {
				Row: {
					created_at: string
					description: string
					homepage: string | null
					id: string
					local: boolean
					name: string
					owner: string
					repo_url: string
					updated_at: string
				}
				Insert: {
					created_at?: string
					description: string
					homepage?: string | null
					id: string
					local?: boolean
					name: string
					owner: string
					repo_url: string
					updated_at?: string
				}
				Update: {
					created_at?: string
					description?: string
					homepage?: string | null
					id?: string
					local?: boolean
					name?: string
					owner?: string
					repo_url?: string
					updated_at?: string
				}
				Relationships: []
			}
			servers: {
				Row: {
					checked: boolean
					connections: Json
					crawl_url: string | null
					created_at: string | null
					description: string
					homepage: string | null
					id: string
					license: string | null
					name: string
					published: boolean
					remote: boolean
					source_url: string
					tags: Json
					updated_at: string | null
					vendor: string | null
					verified: boolean | null
				}
				Insert: {
					checked?: boolean
					connections: Json
					crawl_url?: string | null
					created_at?: string | null
					description: string
					homepage?: string | null
					id: string
					license?: string | null
					name: string
					published?: boolean
					remote?: boolean
					source_url: string
					tags?: Json
					updated_at?: string | null
					vendor?: string | null
					verified?: boolean | null
				}
				Update: {
					checked?: boolean
					connections?: Json
					crawl_url?: string | null
					created_at?: string | null
					description?: string
					homepage?: string | null
					id?: string
					license?: string | null
					name?: string
					published?: boolean
					remote?: boolean
					source_url?: string
					tags?: Json
					updated_at?: string | null
					vendor?: string | null
					verified?: boolean | null
				}
				Relationships: []
			}
			upvotes: {
				Row: {
					created_at: string | null
					id: string
					server_id: string
					user_id: string
				}
				Insert: {
					created_at?: string | null
					id?: string
					server_id: string
					user_id: string
				}
				Update: {
					created_at?: string | null
					id?: string
					server_id?: string
					user_id?: string
				}
				Relationships: [
					{
						foreignKeyName: "upvotes_server_id_servers_id_fk"
						columns: ["server_id"]
						isOneToOne: false
						referencedRelation: "servers"
						referencedColumns: ["id"]
					},
				]
			}
		}
		Views: {
			[_ in never]: never
		}
		Functions: {
			[_ in never]: never
		}
		Enums: {
			[_ in never]: never
		}
		CompositeTypes: {
			[_ in never]: never
		}
	}
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
	PublicTableNameOrOptions extends
		| keyof (PublicSchema["Tables"] & PublicSchema["Views"])
		| { schema: keyof Database },
	TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
		? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
				Database[PublicTableNameOrOptions["schema"]]["Views"])
		: never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
	? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
			Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
			Row: infer R
		}
		? R
		: never
	: PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
				PublicSchema["Views"])
		? (PublicSchema["Tables"] &
				PublicSchema["Views"])[PublicTableNameOrOptions] extends {
				Row: infer R
			}
			? R
			: never
		: never

export type TablesInsert<
	PublicTableNameOrOptions extends
		| keyof PublicSchema["Tables"]
		| { schema: keyof Database },
	TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
		? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
	? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Insert: infer I
		}
		? I
		: never
	: PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
		? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
				Insert: infer I
			}
			? I
			: never
		: never

export type TablesUpdate<
	PublicTableNameOrOptions extends
		| keyof PublicSchema["Tables"]
		| { schema: keyof Database },
	TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
		? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
	? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Update: infer U
		}
		? U
		: never
	: PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
		? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
				Update: infer U
			}
			? U
			: never
		: never

export type Enums<
	PublicEnumNameOrOptions extends
		| keyof PublicSchema["Enums"]
		| { schema: keyof Database },
	EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
		? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
		: never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
	? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
	: PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
		? PublicSchema["Enums"][PublicEnumNameOrOptions]
		: never

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof PublicSchema["CompositeTypes"]
		| { schema: keyof Database },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof Database
	}
		? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
		: never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
	? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
		? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
		: never
