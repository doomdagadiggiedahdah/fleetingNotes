export function normalizeId(serverId: string): string {
	if (serverId.startsWith("@")) {
		const firstSlashIndex = serverId.indexOf("/")
		if (firstSlashIndex !== -1) {
			return `${serverId.substring(0, firstSlashIndex)}-${serverId.substring(firstSlashIndex + 1)}`
		}
	}
	return serverId
}

export function getServerName(serverId: string): string {
	if (serverId.startsWith("@") && serverId.includes("/")) {
		const slashIndex = serverId.indexOf("/");
		return serverId.substring(slashIndex + 1);
	}
	return serverId;
}