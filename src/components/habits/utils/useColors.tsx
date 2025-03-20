import { TFunction } from "i18next";
import { useEffect } from "react";

type useColorsProps = {
    dificulty: number,
    importance: number,
    setDificultyColor: React.Dispatch<React.SetStateAction<string>>,
    setDificultyPhrase: React.Dispatch<React.SetStateAction<string>>,
    setImportanceColor: React.Dispatch<React.SetStateAction<string>>,
    setImportancePhrase: React.Dispatch<React.SetStateAction<string>>,
    t: TFunction
}

export default function useColors(dificulty: number,
    importance: number,
    setDificultyColor: React.Dispatch<React.SetStateAction<string>>,
    setDificultyPhrase: React.Dispatch<React.SetStateAction<string>>,
    setImportanceColor: React.Dispatch<React.SetStateAction<string>>,
    setImportancePhrase: React.Dispatch<React.SetStateAction<string>>, 
    t: TFunction){
    useEffect(() => {
        const dificultyAndImportanceColors = {
            1: "#8EB2C5",
            2: "#F9BF76",
            3: "#E5625C",
            4: "#D1313D"
        }
    
        const dificultyPhrases = {
            1: t('Easy'),
            2: t('Normal'),
            3: t('Hard'),
            4: t('Terrible')
        }
    
        const importancePhrases = {
            1: t('Low'),
            2: t('Medium'),
            3: t('High'),
            4: t('Max')
        }

        switch(dificulty){
            case 1: 
                setDificultyColor(dificultyAndImportanceColors[1]);
                setDificultyPhrase(dificultyPhrases[1]);
                break;
            case 2: 
                setDificultyColor(dificultyAndImportanceColors[2]);
                setDificultyPhrase(dificultyPhrases[2]);
                break;
            case 3: 
                setDificultyColor(dificultyAndImportanceColors[3]);
                setDificultyPhrase(dificultyPhrases[3]);
                break;
            case 4: 
                setDificultyColor(dificultyAndImportanceColors[4]);
                setDificultyPhrase(dificultyPhrases[4]);
                break;
            default:
                setDificultyColor("");
                break;
        }

        switch(importance){
            case 1: 
                setImportanceColor(dificultyAndImportanceColors[1]);
                setImportancePhrase(importancePhrases[1]);
                break;
            case 2: 
                setImportanceColor(dificultyAndImportanceColors[2]);
                setImportancePhrase(importancePhrases[2]);
                break;
            case 3: 
                setImportanceColor(dificultyAndImportanceColors[3]);
                setImportancePhrase(importancePhrases[3]);
                break;
            case 4: 
                setImportanceColor(dificultyAndImportanceColors[4]);
                setImportancePhrase(importancePhrases[4]);
                break;
            default:
                setImportanceColor("");
                break;
        }
    }, [dificulty, importance, t])
}