import { useState } from "react";
import type { UserFolder } from "@/components/sidebar/SidebarGroupNav";

export function useFolders() {
  const [folders, setFolders] = useState<UserFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const handleFolderAdd = (name: string) => {
    setFolders((prev) => [
      ...prev,
      { id: `folder-${Date.now()}`, name, layerIds: [], planNames: [] },
    ]);
  };

  const handleFolderRemove = (id: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    if (activeFolderId === id) setActiveFolderId(null);
  };

  return {
    folders,
    activeFolderId,
    setActiveFolderId,
    handleFolderAdd,
    handleFolderRemove
  };
}
