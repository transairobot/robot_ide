export interface Scene {
  id: string
  name: string
  description: string
  img: string // URL to the image
  mjcf_xml: string // Path to the MJCF XML file
  visible?: boolean
}

export const fetchScenes = async (): Promise<Scene[]> => {
  try {
    // TODO: Replace with the actual backend API URL
    const response = await fetch('/api/scenes');
    if (!response.ok) {
      throw new Error(`Failed to fetch scenes: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.map((scene: any) => ({
      ...scene,
      visible: scene.visible ?? true // Default to true if not specified
    }));
  } catch (error) {
    console.error("Error fetching scenes:", error);
    // Fallback to some default scenes if API call fails
    return [
      { id: "1", name: "Warehouse", description: "Industrial warehouse environment", img: "/images/warehouse.jpg", mjcf_xml: "/models/warehouse.xml", visible: true },
      { id: "2", name: "Office", description: "Modern office space", img: "/images/office.jpg", mjcf_xml: "/models/office.xml", visible: false },
      { id: "3", name: "Factory Floor", description: "Manufacturing floor simulation", img: "/images/factory.jpg", mjcf_xml: "/models/factory.xml", visible: true },
    ];
  }
};
