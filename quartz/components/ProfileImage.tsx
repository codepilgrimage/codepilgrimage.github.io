import { pathToRoot } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

const ProfileImage: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
    const baseDir = pathToRoot(fileData.slug!)
    return (
        <div class={classNames(displayClass, "profile-image-container")}>
            <a href={baseDir}>
                <img
                    src={`${baseDir}/profile.png`}
                    class="profile-image"
                    alt="Profile"
                />
            </a>
        </div>
    )
}

ProfileImage.css = `
.profile-image-container {
  display: flex;
  margin-bottom: -0.5rem;
  justify-content: center;
}
.profile-image {
  border-radius: 25%;
  width: 100px;
  height: 100px;
  object-fit: cover;
  transition: transform 0.2s ease;
}
.profile-image:hover {
  transform: scale(1.05);
}
`

export default (() => ProfileImage) satisfies QuartzComponentConstructor
