"use client";

import { useState } from "react";
import { ProfileCard } from "@/components/ui/ProfileCard";
import { InfoForm } from "@/components/ui/InfoForm";
import type { InfoFormValues } from "@/components/ui/InfoForm";
import type { UserRole } from "@/lib/users";
import { useUnsavedChangesWarning } from "@/lib/hooks/useUnsavedChangesWarning";
import styles from "./edit.module.css";

interface MemberEditClientProps {
  userId: string;
  name: string;
  email: string;
  picture: string;
  role: UserRole;
  defaultValues: InfoFormValues;
  canEditEmail?: boolean;
}

export function MemberEditClient({
  userId,
  name,
  email: initialEmail,
  picture: initialPicture,
  role,
  defaultValues,
  canEditEmail = false,
}: MemberEditClientProps) {
  const [picture, setPicture] = useState(initialPicture);
  const [savedPicture, setSavedPicture] = useState(initialPicture);
  const [email, setEmail] = useState(initialEmail);
  const [savedEmail, setSavedEmail] = useState(initialEmail);

  useUnsavedChangesWarning(picture !== savedPicture || email !== savedEmail);

  return (
    <div className={styles.grid}>
      <div className={styles.profileCard}>
        <ProfileCard
          name={name}
          email={email}
          picture={picture}
          role={role}
          onImageChange={setPicture}
        />
      </div>

      <div className={styles.formCard}>
        <InfoForm
          userId={userId}
          defaultValues={defaultValues}
          picture={picture}
          requireImage={false}
          defaultRole={role}
          editableEmail={canEditEmail}
          email={email}
          onEmailChange={setEmail}
          submitLabel="Save Changes"
          onSaved={() => {
            setSavedPicture(picture);
            setSavedEmail(email);
          }}
        />
      </div>
    </div>
  );
}
