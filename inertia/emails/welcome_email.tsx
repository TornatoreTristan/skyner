import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Hr,
} from '@react-email/components'
import * as React from 'react'

interface WelcomeEmailProps {
  userName: string
  loginUrl: string
}

export default function WelcomeEmail({ userName, loginUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Bienvenue sur notre plateforme !</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Bienvenue {userName} ! 👋</Heading>

          <Text style={text}>
            Nous sommes ravis de vous accueillir sur notre plateforme. Votre compte a été créé
            avec succès et vous pouvez maintenant profiter de toutes nos fonctionnalités.
          </Text>

          <Button style={button} href={loginUrl}>
            Accéder à mon compte
          </Button>

          <Text style={text}>
            Vous pouvez vous connecter à tout moment en utilisant l'email avec lequel vous vous
            êtes inscrit.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Si vous n'avez pas créé ce compte, vous pouvez ignorer cet email en toute sécurité.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 48px',
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 48px',
}

const button = {
  backgroundColor: '#5469d4',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px',
  margin: '27px 48px',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 48px',
}

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 48px',
}