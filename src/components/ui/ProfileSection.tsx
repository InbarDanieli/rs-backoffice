"use client";

import { useState } from "react";
import { ProfileCard } from "./ProfileCard";
import { InfoForm, type InfoFormValues } from "./InfoForm";
import styles from "./ProfileSection.module.css";
import { UserRole } from "@/lib/users";

interface ProfileSectionProps {
  userId: string;
  name: string;
  email: string;
  picture: string;
  role?: UserRole;
  defaultValues: InfoFormValues;
}

export function ProfileSection({
  userId,
  name,
  email,
  picture: initialPicture,
  role,
  defaultValues,
}: ProfileSectionProps) {
  const [picture, setPicture] = useState(initialPicture);

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
          defaultRole={role}
          defaultValues={defaultValues}
          picture={picture}
        />
      </div>
    </div>
  );
}
