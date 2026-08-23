// functions
import loginRequest from "./request/loginRequest";
import { hydratePerfil } from "../user/hydratePerfil";
// types
import { TFunction } from "i18next";
import { Dispatch, UnknownAction } from "@reduxjs/toolkit";
import { UserType } from "@beyou/types/user/UserType";
import { NavigateFunction } from "react-router-dom";
import { RATE_LIMIT_ERROR_KEY } from "@beyou/api/apiError";

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
        if (response.error === RATE_LIMIT_ERROR_KEY) {
            return t(RATE_LIMIT_ERROR_KEY);
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
