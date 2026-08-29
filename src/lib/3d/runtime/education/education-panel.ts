import type { SemanticComponentId } from "../core/types";
import type { EducationContentModel, EducationActionItem } from "./types";
import { getComponentName, getStageName } from "./display-names";

export interface EducationPanelOptions {
  container: HTMLElement;
  onSelectComponent: (id: SemanticComponentId) => void;
  onDisassembleComponent: (id: SemanticComponentId) => void;
  onClearSelection: () => void;
}

export class EducationPanel {
  readonly #options: EducationPanelOptions;
  readonly #element: HTMLElement;
  #currentContent: EducationContentModel | null = null;
  #currentActions: readonly EducationActionItem[] = [];
  #detailsExpanded = false;

  constructor(options: EducationPanelOptions) {
    this.#options = options;
    this.#element = document.createElement("div");
    this.#element.className = "education-panel";
    this.#element.hidden = true;
    this.#options.container.appendChild(this.#element);
  }

  get element(): HTMLElement {
    return this.#element;
  }

  get isVisible(): boolean {
    return !this.#element.hidden;
  }

  get currentContent(): EducationContentModel | null {
    return this.#currentContent;
  }

  render(content: EducationContentModel | null, actions: readonly EducationActionItem[] = []): void {
    this.#currentContent = content;
    this.#currentActions = actions;
    this.#detailsExpanded = false;

    this.#element.replaceChildren();

    if (!content) {
      this.#element.hidden = true;
      return;
    }

    this.#element.hidden = false;

    const card = document.createElement("div");
    card.className = "edu-card";

    // Header
    const header = document.createElement("header");
    header.className = "edu-header";

    const headerMeta = document.createElement("div");
    headerMeta.className = "edu-header-meta";

    const catBadge = document.createElement("span");
    catBadge.className = "edu-category-badge";
    catBadge.textContent = this.#formatCategory(content.category);
    headerMeta.appendChild(catBadge);

    if (content.instanceMetadata) {
      const instBadge = document.createElement("span");
      instBadge.className = "edu-instance-badge";
      instBadge.textContent = content.instanceMetadata.slotLabel;
      headerMeta.appendChild(instBadge);
    }

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "edu-close-btn";
    closeBtn.dataset.action = "clear";
    closeBtn.setAttribute("aria-label", "Close component details");
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", () => this.#options.onClearSelection());

    header.append(headerMeta, closeBtn);

    // Title & Description
    const titleEl = document.createElement("h2");
    titleEl.className = "edu-title";
    titleEl.id = "edu-panel-title";
    titleEl.textContent = content.displayName;

    const shortDesc = document.createElement("p");
    shortDesc.className = "edu-short-desc";
    shortDesc.textContent = content.shortDescription;

    card.append(header, titleEl, shortDesc);

    // Connections
    if (content.connections.length > 0) {
      const connContainer = document.createElement("div");
      connContainer.className = "edu-connections";

      const chipsRow = document.createElement("div");
      chipsRow.className = "edu-chips-row";
      chipsRow.setAttribute("role", "list");

      for (const conn of content.connections) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "edu-chip";
        chip.dataset.componentTarget = conn.target;
        chip.title = conn.description;
        chip.setAttribute("role", "listitem");

        const typeSpan = document.createElement("span");
        typeSpan.className = "edu-chip-type";
        typeSpan.textContent = this.#formatConnectionType(conn.type);

        const labelSpan = document.createElement("span");
        labelSpan.className = "edu-chip-label";
        labelSpan.textContent = getComponentName(conn.target);

        chip.append(typeSpan, labelSpan);
        chip.addEventListener("click", () => {
          this.#options.onSelectComponent(conn.target as SemanticComponentId);
        });
        chipsRow.appendChild(chip);
      }

      connContainer.appendChild(chipsRow);
      card.appendChild(connContainer);
    }

    // Collapsible Details
    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "edu-details-toggle";
    toggleBtn.setAttribute("aria-expanded", "false");
    toggleBtn.setAttribute("aria-controls", "edu-details-body");

    const chevron = document.createElement("span");
    chevron.className = "chevron";
    chevron.textContent = "▸";
    toggleBtn.append(chevron, document.createTextNode(" More details"));

    const detailsBody = document.createElement("div");
    detailsBody.id = "edu-details-body";
    detailsBody.className = "edu-details-body";

    const purposeSection = document.createElement("div");
    purposeSection.className = "edu-section edu-purpose";

    const purposeTitle = document.createElement("h3");
    purposeTitle.className = "edu-section-title";
    purposeTitle.textContent = "Purpose & Function";

    const purposeText = document.createElement("p");
    purposeText.className = "edu-purpose-text";
    purposeText.textContent = content.purpose;

    purposeSection.append(purposeTitle, purposeText);
    detailsBody.appendChild(purposeSection);

    if (content.keyLearningPoints.length > 0) {
      const pointsSection = document.createElement("div");
      pointsSection.className = "edu-section edu-learning-points";

      const pointsTitle = document.createElement("h3");
      pointsTitle.className = "edu-section-title";
      pointsTitle.textContent = "Key Learning Points";

      const pointsList = document.createElement("ul");
      pointsList.className = "edu-points-list";

      for (const pt of content.keyLearningPoints) {
        const li = document.createElement("li");
        li.textContent = pt;
        pointsList.appendChild(li);
      }

      pointsSection.append(pointsTitle, pointsList);
      detailsBody.appendChild(pointsSection);
    }

    toggleBtn.addEventListener("click", () => {
      this.#detailsExpanded = !this.#detailsExpanded;
      toggleBtn.setAttribute("aria-expanded", String(this.#detailsExpanded));
      if (this.#detailsExpanded) {
        detailsBody.classList.add("expanded");
        chevron.textContent = "▾";
      } else {
        detailsBody.classList.remove("expanded");
        chevron.textContent = "▸";
      }
    });

    card.append(toggleBtn, detailsBody);

    // Footer
    const footer = document.createElement("footer");
    footer.className = "edu-footer";

    const disAction = actions.find((a) => a.id === "disassemble");
    const stageDisplayName = disAction?.stageId ? getStageName(disAction.stageId) : null;
    if (disAction && stageDisplayName) {
      const disBtn = document.createElement("button");
      disBtn.type = "button";
      disBtn.className = "edu-action-btn edu-btn-disassemble";
      disBtn.dataset.action = "disassemble";
      disBtn.setAttribute("aria-label", stageDisplayName);

      const disSpan = document.createElement("span");
      disSpan.textContent = stageDisplayName;
      disBtn.appendChild(disSpan);

      disBtn.addEventListener("click", () => {
        if (content) {
          this.#options.onDisassembleComponent(content.id);
        }
      });
      footer.appendChild(disBtn);
    }

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "edu-action-btn edu-btn-clear";
    clearBtn.dataset.action = "clear";
    clearBtn.textContent = "Deselect";
    clearBtn.addEventListener("click", () => this.#options.onClearSelection());
    footer.appendChild(clearBtn);

    card.appendChild(footer);
    this.#element.appendChild(card);
  }

  #formatCategory(cat: string): string {
    const map: Record<string, string> = {
      chassis: "Chassis",
      compute: "Compute",
      memory: "Memory",
      graphics: "Graphics",
      storage: "Storage",
      power: "Power",
      cooling: "Cooling",
      connectivity: "Connectivity",
    };
    return map[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1);
  }

  #formatConnectionType(type: string): string {
    const map: Record<string, string> = {
      mounts_on: "On",
      mounted_by: "Holds",
      connects_to: "→",
      powers: "Powers",
      receives_power: "Power",
      encloses: "Wraps",
      enclosed_by: "In",
      routes_to: "→",
      cools: "Cools",
      cooled_by: "Cooled",
      communicates_with: "Bus",
    };
    return map[type] ?? "·";
  }

  dispose(): void {
    this.#element.remove();
    this.#currentContent = null;
    this.#currentActions = [];
  }
}
