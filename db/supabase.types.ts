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
			api_keys: {
				Row: {
					api_key: string
					owner: string | null
					timestamp: string
				}
				Insert: {
					api_key?: string
					owner?: string | null
					timestamp?: string
				}
				Update: {
					api_key?: string
					owner?: string | null
					timestamp?: string
				}
				Relationships: []
			}
			candidate_urls: {
				Row: {
					crawl_url: string
					created_at: string | null
					errored: boolean
					processed: boolean
				}
				Insert: {
					crawl_url: string
					created_at?: string | null
					errored?: boolean
					processed?: boolean
				}
				Update: {
					crawl_url?: string
					created_at?: string | null
					errored?: boolean
					processed?: boolean
				}
				Relationships: []
			}
			deployments: {
				Row: {
					branch: string
					commit: string
					commit_message: string
					created_at: string
					deployment_url: string | null
					id: string
					logs: string | null
					repo: string
					server_id: string
					status: Database["public"]["Enums"]["deployment_status"]
					updated_at: string
				}
				Insert: {
					branch: string
					commit: string
					commit_message: string
					created_at?: string
					deployment_url?: string | null
					id?: string
					logs?: string | null
					repo: string
					server_id: string
					status: Database["public"]["Enums"]["deployment_status"]
					updated_at?: string
				}
				Update: {
					branch?: string
					commit?: string
					commit_message?: string
					created_at?: string
					deployment_url?: string | null
					id?: string
					logs?: string | null
					repo?: string
					server_id?: string
					status?: Database["public"]["Enums"]["deployment_status"]
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: "deployments_repo_server_repos_id_fk"
						columns: ["repo"]
						isOneToOne: false
						referencedRelation: "server_repos"
						referencedColumns: ["id"]
					},
					{
						foreignKeyName: "deployments_server_id_servers_id_fk"
						columns: ["server_id"]
						isOneToOne: false
						referencedRelation: "servers"
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
			pull_requests: {
				Row: {
					created_at: string
					id: string
					is_closed: boolean
					merged_at: string | null
					pr_id: string
					pr_task: Database["public"]["Enums"]["pr_task"]
					server_repo: string
				}
				Insert: {
					created_at?: string
					id?: string
					is_closed?: boolean
					merged_at?: string | null
					pr_id: string
					pr_task: Database["public"]["Enums"]["pr_task"]
					server_repo: string
				}
				Update: {
					created_at?: string
					id?: string
					is_closed?: boolean
					merged_at?: string | null
					pr_id?: string
					pr_task?: Database["public"]["Enums"]["pr_task"]
					server_repo?: string
				}
				Relationships: [
					{
						foreignKeyName: "pull_requests_server_repo_server_repos_id_fk"
						columns: ["server_repo"]
						isOneToOne: false
						referencedRelation: "server_repos"
						referencedColumns: ["id"]
					},
				]
			}
			pull_requests_failures: {
				Row: {
					created_at: string
					error: string
					id: string
					pr_task: Database["public"]["Enums"]["pr_task"]
					server_repo: string
				}
				Insert: {
					created_at?: string
					error: string
					id?: string
					pr_task: Database["public"]["Enums"]["pr_task"]
					server_repo: string
				}
				Update: {
					created_at?: string
					error?: string
					id?: string
					pr_task?: Database["public"]["Enums"]["pr_task"]
					server_repo?: string
				}
				Relationships: [
					{
						foreignKeyName: "pull_requests_failures_server_repo_server_repos_id_fk"
						columns: ["server_repo"]
						isOneToOne: true
						referencedRelation: "server_repos"
						referencedColumns: ["id"]
					},
				]
			}
			server_repos: {
				Row: {
					base_directory: string
					created_at: string
					id: string
					repo_name: string
					repo_owner: string
					server_id: string
					type: Database["public"]["Enums"]["provider"]
					updated_at: string
				}
				Insert: {
					base_directory?: string
					created_at?: string
					id?: string
					repo_name: string
					repo_owner: string
					server_id: string
					type: Database["public"]["Enums"]["provider"]
					updated_at?: string
				}
				Update: {
					base_directory?: string
					created_at?: string
					id?: string
					repo_name?: string
					repo_owner?: string
					server_id?: string
					type?: Database["public"]["Enums"]["provider"]
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: "server_repos_server_id_servers_id_fk"
						columns: ["server_id"]
						isOneToOne: false
						referencedRelation: "servers"
						referencedColumns: ["id"]
					},
				]
			}
			servers: {
				Row: {
					checked: boolean
					connections: Json
					crawl_url: string | null
					created_at: string
					description: string
					description_long: string | null
					display_name: string
					embedding: string | null
					homepage: string | null
					id: string
					license: string | null
					owner: string | null
					published: boolean
					qualified_name: string
					remote: boolean
					updated_at: string
					verified: boolean | null
				}
				Insert: {
					checked?: boolean
					connections: Json
					crawl_url?: string | null
					created_at?: string
					description: string
					description_long?: string | null
					display_name: string
					embedding?: string | null
					homepage?: string | null
					id?: string
					license?: string | null
					owner?: string | null
					published?: boolean
					qualified_name: string
					remote?: boolean
					updated_at?: string
					verified?: boolean | null
				}
				Update: {
					checked?: boolean
					connections?: Json
					crawl_url?: string | null
					created_at?: string
					description?: string
					description_long?: string | null
					display_name?: string
					embedding?: string | null
					homepage?: string | null
					id?: string
					license?: string | null
					owner?: string | null
					published?: boolean
					qualified_name?: string
					remote?: boolean
					updated_at?: string
					verified?: boolean | null
				}
				Relationships: []
			}
		}
		Views: {
			server_usage_counts: {
				Row: {
					serverId: string | null
					useCount: number | null
				}
				Relationships: []
			}
		}
		Functions: {
			[_ in never]: never
		}
		Enums: {
			deployment_status:
				| "QUEUED"
				| "WORKING"
				| "SUCCESS"
				| "FAILURE"
				| "INTERNAL_ERROR"
				| "CANCELLED"
			pr_task: "config" | "readme"
			provider: "github"
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
