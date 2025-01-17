import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "next-themes";
import { useState } from "react";

export function Settings() {
  const { theme, setTheme } = useTheme();
  const [language, setLanguage] = useState("fr");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium mb-2">Thème</h2>
        <div className="flex space-x-2">
          <Button
            variant={theme === "light" ? "default" : "outline"}
            onClick={() => setTheme("light")}
          >
            Clair
          </Button>
          <Button
            variant={theme === "dark" ? "default" : "outline"}
            onClick={() => setTheme("dark")}
          >
            Sombre
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium mb-2">Langue de transcription</h2>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sélectionner une langue" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fr">Français</SelectItem>
            <SelectItem value="en">Anglais</SelectItem>
            <SelectItem value="es">Espagnol</SelectItem>
            <SelectItem value="de">Allemand</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}