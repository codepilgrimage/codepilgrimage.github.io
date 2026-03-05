import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

export default (() => {
    const EmailSubscription: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
        return (
            <div class={`email-subscription ${displayClass ?? ""}`}>
                <h3>Subscribe to Newsletter</h3>
                <p>Get the latest learnings delivered to your inbox.</p>
                <form
                    action="https://buttondown.email/api/emails/embed-subscribe/codepilgrimage"
                    method="post"
                    target="_blank"
                    class="embeddable-buttondown-form"
                    style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem" }}
                >
                    <input type="email" name="email" id="bd-email" placeholder="you@domain.com" required style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--lightgray)", background: "var(--light)", color: "var(--dark)" }} />
                    <input type="submit" value="Subscribe" style={{ padding: "0.5rem", borderRadius: "4px", background: "var(--secondary)", color: "var(--light)", border: "none", cursor: "pointer", fontWeight: "bold" }} />
                </form>
            </div>
        )
    }
    return EmailSubscription
}) satisfies QuartzComponentConstructor
