import {Ollama} from "ollama";

export class LocalOllama {
    instance: Ollama

    constructor() {
        this.instance = new Ollama({ host: 'http://127.0.0.1:11434'})
    }
}