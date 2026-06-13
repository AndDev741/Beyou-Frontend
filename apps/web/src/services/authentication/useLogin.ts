// functions
import loginRequest from "./request/loginRequest";
import { hydratePerfil } from "../user/hydratePerfil";
// types
import { TFunction } from "i18next";
import { Dispatch, UnknownAction } from "@reduxjs/toolkit";
import { UserType } from "../../types/user/UserType";
import { NavigateFunction } from "react-router-dom";

export default async function handleLogin(
    email: string,
    password: string,
    t: TFunction,
    dispatch: Dispatch<UnknownAction>,
    navigate: NavigateFunction
): Promise<string | null> {
    const response = await loginRequest(email, password);
    if (response.error) {
        if (response.error === "EMAIL_NOT_VERIFIED") {
            return t("EmailNotVerifiedError");
        }
        return t("WrongPassOrEmailError");
    }
    if (response.success) {
        const data = response.success as UserType;
        hydratePerfil(dispatch, data);
        navigate("/dashboard");
        return null;
    }
    return t("UnknownError");
}
