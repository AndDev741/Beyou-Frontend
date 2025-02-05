import IAImg from "../../assets/IAIcon.svg";
import axios from "axios";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function GenerateCategoryByAi({setGeneratedCategories}){
    const {t} = useTranslation();
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;

    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [tried, setTried] = useState(false);
    
    const fetchSuggestion = async () => {
        if(tried === true){
            setError(t("AlreadyGeneratedError"));
            return;
        }
        setIsLoading(true);
        const body = {
          model: "gpt-4o-mini",
          messages: [
            {
              "role": "system",
              "content": t("gptSystemPrompt")
            },
            {
              "role": "user",
              "content": t("gptClientPrompt")
            }
          ]
        }
  
        try{
            const response = await axios.post("https://api.openai.com/v1/chat/completions", body, {
                headers: {
                  "Authorization": `Bearer ${apiKey}`,
                  "Content-Type": "application/json"
              }});
              
            const data = await response.data;
            setGeneratedCategories({});
            setGeneratedCategories(JSON.parse(data.choices[0].message.content));
        }catch(e){
            console.error(e);
            setError(t("gptError"))
        }finally{
            setTried(true);
            setIsLoading(false);
        }
      };

      return(
        <div className="flex flex-col items-center">
            <p className="text-lg text-center text-red-500 my-3">{error}</p>
            <p className={`${isLoading === true ? "text-center animate-pulse text-xl text-blueMain" : "hidden"}`}>
                {t("Generating")}...
            </p>
            <div onClick={() => fetchSuggestion()}
            className="flex items-center justify-center border-[1px] border-blueMain rounded-xl md:w-[450px] h-[60px] mb-8 mx-8 cursor-pointer hover:scale-105">
                <img src={IAImg}
                alt="ia icon"
                className="w-[60px] md:w-[70px]"/>
                <h1 className=" font-medium lg:text-lg text-center">{t("Generate a random category")}</h1>
            </div>
        </div>
      )

}