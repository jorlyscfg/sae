'use server';

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function changePassword(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "No autorizado" };
    }

    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
        return { error: "Las contraseñas no coinciden" };
    }

    if (newPassword.length < 8) {
        return { error: "La contraseña debe tener al menos 8 caracteres" };
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id }
    });

    if (!user || !user.password) {
        return { error: "Usuario no encontrado" };
    }

    const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordCorrect) {
        return { error: "La contraseña actual es incorrecta" };
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { id: session.user.id },
        data: { password: hashedNewPassword }
    });

    revalidatePath("/configuracion");
    return { success: "Contraseña actualizada correctamente" };
}
