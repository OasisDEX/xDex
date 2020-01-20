import { tid } from "../../utils";

export class Modal {
    public static close = () => {
        cy.get(tid('close-modal')).click({force: true});
    }

    public static open = (button: any) => {
        button.click();
    }
}