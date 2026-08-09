import IAImg from "../../assets/IAIcon.svg";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import categoryGeneratedByAi from "@beyou/types/category/categoryGeneratedByAiType";

type prop = {setGeneratedCategory: React.Dispatch<React.SetStateAction<categoryGeneratedByAi>>}

// TODO: re-enable via backend proxy POST /api/v1/ai/generate-category.
// Direct OpenAI calls from the browser are unsafe: any API key shipped in a
// VITE_ env var is baked into the bundle and trivially readable by users.
// When re-enabling, route the request through the Spring backend, which
// authenticates with OpenAI server-side and returns the parsed category.
export default function GenerateCategoryByAi({setGeneratedCategory}: prop){
    const {t} = useTranslation();

    const [error, setError] = useState("");
    const [isLoading] = useState(false);
    const [tried, setTried] = useState(false);

    // Suppress unused-prop warning until the backend proxy is wired up.
    void setGeneratedCategory;

    const fetchSuggestion = () => {
        if(tried){
            setError(t("AlreadyGeneratedError"));
            return;
        }
        // Feature intentionally disabled — needs backend proxy before re-enabling.
        setError(t("gptError"));
        setTried(true);
    };

      return(
        <div className="flex flex-col items-center text-text bg-surface">
            <p className="text-lg text-center text-danger my-3">{error}</p>
            <p className={`${isLoading === true ? "text-center animate-pulse text-xl text-accent" : "hidden"}`}>
                {t("Generating")}...
            </p>
            <div onClick={() => fetchSuggestion()}
            className="flex items-center justify-center border border-border rounded-card p-2 md:w-[450px] h-[60px] mb-8 mx-8 cursor-pointer hover:scale-105 transition-transform duration-200 bg-accent/10 hover:bg-accent/20">
                <img src={IAImg}
                alt="ia icon"
                className="w-[60px] md:w-[70px]"/>
                <h1 className=" font-medium lg:text-lg text-center">{t("Generate a random category")}</h1>
            </div>
        </div>
      )

}
