export interface ReasoningModelResponse {
    thoughts: string,
    message: string,
}
export function splitReasoningResponse(response: string) {
    const splitResponse = response.split(`</think>`)
    if (splitResponse.length > 1) {
        return {
            thoughts: splitResponse[0],
            message: splitResponse[1].trim()
        }
    } else {
        return {
            thoughts: "",
            message: splitResponse[0]
        }
    }
}
